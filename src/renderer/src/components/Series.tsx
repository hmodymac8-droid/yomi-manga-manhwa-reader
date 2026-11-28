import { Tags } from './Tags'
import { Icon } from './Icon'
import { useEffect, useRef, useState } from 'react'
import type { DownloadItem, DownloadRequest, FollowInfo, ProgressRecord, SeriesDetail, SiteSpeed } from '../../../preload/index.d'
import { createShareLink, type ShareInfo } from '../shareCard'
import { OpenChapter, OpenSeries, chapterKey, chapterNumber as numberInTitle, fallbackCover, pageSrc, coverSrc } from '../lib'
import AniListLinkPanel from './AniListLink'
import { SimilarRow } from './Similar'
import { MalLine } from './Mal'
import { num, t } from '../i18n'

interface Props {
  series: OpenSeries
  onBack: () => void
  /** Name of the screen Back returns to ("Following", "Discover"…). */
  backLabel: string
  onRead: (c: OpenChapter) => void
  /** Opens another series (from "Similar on your sites"). */
  onOpen?: (s: OpenSeries) => void
}

type Ch = SeriesDetail['chapters'][number]

const chapterNumber = (title: string): number => {
  const m = title.match(/(\d+(?:\.\d+)?)/)
  return m ? Number(m[1]) : 0
}
const SPEED_TEXT: Record<SiteSpeed['label'], string> = {
  fast: 'Fast',
  ok: 'OK',
  slow: 'Slow',
  trouble: 'Having trouble',
  new: 'Not timed yet'
}
// with the typical chapter-open time: whole sentences, so "OK" here never takes the OK button's word
const SPEED_TIMED: Record<Exclude<SiteSpeed['label'], 'new'>, string> = {
  fast: 'Fast · chapters open in about {s} s',
  ok: 'OK · chapters open in about {s} s',
  slow: 'Slow · chapters open in about {s} s',
  trouble: 'Having trouble · chapters open in about {s} s'
}
const speedTitle = (s: SiteSpeed | undefined): string =>
  !s
    ? ''
    : s.ms !== undefined && s.label !== 'new'
      ? t(SPEED_TIMED[s.label], { s: (s.ms / 1000).toFixed(1) })
      : t(SPEED_TEXT[s.label])

/** Like chapterNumber, but a chapter with no number sorts last instead of as chapter 0. */
const numberOrNone = (title: string): number => numberInTitle(title) ?? -Infinity

export default function Series({ series, onBack, onRead, onOpen, backLabel }: Props): React.JSX.Element {
  const [entryIdx, setEntryIdx] = useState(0)
  const [entries, setEntries] = useState(series.entries)
  const [switchNote, setSwitchNote] = useState('')
  const [pinReady, setPinReady] = useState(false)
  // how each site is doing (speed dots), and the site you picked for this title
  const [speeds, setSpeeds] = useState<Record<string, SiteSpeed>>({})
  const [pinnedId, setPinnedId] = useState<string | undefined>(undefined)
  // the story without the site's advertising, or another site's (or AniList's) when this one has none
  const [story, setStory] = useState<{ key: string; text: string; from?: string } | null>(null)
  const forced = useRef(false)
  const switched = useRef(false)
  const [seenTitle, setSeenTitle] = useState(series.title)
  if (seenTitle !== series.title) {
    setSeenTitle(series.title)
    setEntries(series.entries)
    setEntryIdx(0)
    setSwitchNote('')
    setPinReady(false)
  }
  const [detail, setDetail] = useState<SeriesDetail | null>(null)
  const [error, setError] = useState('')
  const [offline, setOffline] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  // progress while the chapter list is collected: when it started, and how many chapters the page says it has
  const [loadStart, setLoadStart] = useState(0)
  const [expected, setExpected] = useState<number | undefined>(undefined)
  const [partial, setPartial] = useState(false)
  // chapters this site lacks, filled in from your other sites (holes in the list, or newer chapters)
  const [fills, setFills] = useState<Ch[]>([])
  // chapters this load has collected so far (the screen may still show a longer saved list meanwhile)
  const [found, setFound] = useState(0)
  // why the latest refresh failed while an older saved list is being shown (empty when it worked)
  const [refreshError, setRefreshError] = useState('')
  // bumped by the buttons to run the loading again; `mode` says how much to re-read
  const [attempt, setAttempt] = useState(0)
  const [mode, setMode] = useState<'auto' | 'check' | 'full'>('auto')
  const reload = (m: 'auto' | 'check' | 'full'): void => {
    setMode(m)
    setAttempt((a) => a + 1)
  }
  const [newestFirst, setNewestFirst] = useState(true)
  const entry = entries[entryIdx] ?? entries[0]
  const [progress, setProgress] = useState<ProgressRecord | null>(null)
  const description = detail?.description ?? ''
  const storyKey = entry.url + '\n' + description
  const hasDetail = !!detail
  useEffect(() => {
    if (!hasDetail) return
    let cancelled = false
    const key = storyKey
    window.api
      .seriesStory(
        series.title,
        entry.url,
        entry.sourceId,
        description,
        entries.map((e) => ({ sourceId: e.sourceId, sourceName: e.sourceName, url: e.url }))
      )
      .then((r) => !cancelled && setStory({ key, ...r }))
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
    // (the other sites' list only matters when it first arrives; it doesn't ask again on every change)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyKey, hasDetail, entries.length])
  const [dls, setDls] = useState<Record<string, DownloadItem>>({})
  const [follow, setFollowInfo] = useState<FollowInfo | null>(null)
  const [shareNote, setShareNote] = useState('')
  const shareInfo = (): ShareInfo => ({
    title: detail?.title || series.title,
    cover: series.cover || detail?.cover || '',
    coverReferer: series.coverReferer,
    tags: [...(detail?.type ? [detail.type[0].toUpperCase() + detail.type.slice(1)] : []), ...(detail?.genres ?? [])],
    chapters: detail?.chapters.length ?? 0,
    reading: progress?.chapterTitle
  })

  // Following state + which chapters are new, kept live while the background checker runs.
  useEffect(() => {
    let cancelled = false
    const load = (): void => {
      window.api.followGet(entry.url).then((f) => !cancelled && setFollowInfo(f))
    }
    load()
    const off = window.api.onUpdates(load)
    return () => {
      cancelled = true
      off()
    }
  }, [entry.url])

  const toggleFollow = async (): Promise<void> => {
    await window.api.followSet(
      {
        seriesUrl: entry.url,
        sourceId: entry.sourceId,
        title: series.title,
        cover: series.cover,
        coverReferer: series.coverReferer
      },
      !follow?.following
    )
    setFollowInfo(await window.api.followGet(entry.url))
  }
  const newKeys = new Set((follow?.unreadChapters ?? []).map((c) => chapterKey(c.title)))

  // Reading progress for the selected source (re-read whenever we come back from the reader).
  useEffect(() => {
    let cancelled = false
    window.api.progressGet(entry.url).then((p) => !cancelled && setProgress(p))
    return () => {
      cancelled = true
    }
  }, [entry.url])

  // Download states for this series, kept live while jobs run.
  useEffect(() => {
    let cancelled = false
    window.api.downloadList().then((list) => {
      if (cancelled) return
      setDls(Object.fromEntries(list.filter((i) => i.seriesUrl === entry.url).map((i) => [i.id, i])))
    })
    const off = window.api.onDownload((i) => {
      if (i.seriesUrl !== entry.url) return
      setDls((prev) => {
        const next = { ...prev }
        if (i.status === 'removed') delete next[i.id]
        else next[i.id] = i
        return next
      })
    })
    return () => {
      cancelled = true
      off()
    }
  }, [entry.url])

  useEffect(() => {
    forced.current = false
    switched.current = false
    let cancel = false
    // open from the site you picked, else the one you last read it on, else the fastest healthy one; a series from
    // Following / Continue reading also gets the same title on your other sites
    window.api
      .seriesStart(
        series.title,
        series.entries.map((e) => ({ sourceId: e.sourceId, sourceName: e.sourceName, url: e.url }))
      )
      .then((r) => {
        if (cancel) return
        if (r.entries.length > 0) {
          setEntries(r.entries)
          setEntryIdx(Math.max(0, r.entries.findIndex((e) => e.url === r.start)))
        }
        setSpeeds(r.speeds)
        setPinnedId(r.pinned)
      })
      .catch(() => undefined)
      .finally(() => !cancel && setPinReady(true))
    return () => {
      cancel = true
    }
  }, [series.title])

  useEffect(() => {
    if (!pinReady) return
    let cancelled = false
    let gotFresh = false
    let haveCached = false
    let offPartial = (): void => undefined
    const goAlt = async (): Promise<boolean> => {
      if (cancelled || switched.current) return false
      const sites = await window.api.fallbackSites(series.title, [entry.sourceId])
      if (cancelled) return false
      const alt = sites[0]
      if (!alt || alt.url === entry.url) return false
      switched.current = true
      setSwitchNote(t('{site} is down. Showing {other} instead.', { site: entry.sourceName, other: alt.sourceName }))
      const idx = entries.findIndex((e) => e.url === alt.url)
      setEntries((prev) => (prev.some((e) => e.url === alt.url) ? prev : [...prev, alt]))
      setEntryIdx(idx >= 0 ? idx : entries.length)
      return true
    }
    void (async () => {
      const offlineNow = await window.api.offlineGet()
      if (!cancelled && !forced.current && !offlineNow) {
        const state = await window.api.sourceState(entry.sourceId)
        if (cancelled) return
        if ((state.availability === 'down' || state.availability === 'degraded') && (await goAlt()))
          return
      }
      forced.current = false
      if (cancelled) return
      setLoading(true)
      setError('')
      setOffline(false)
      setDetail(null)
      setRefreshing(false)
      setRefreshError('')
      setLoadStart(Date.now())
      setExpected(undefined)
      setPartial(false)
      setFound(0)
      // Show the last known chapter list instantly, then replace it with the fresh one when it arrives.
      window.api.getSeriesCached(entry.url).then((cached) => {
        if (cancelled || gotFresh || !cached) return
        haveCached = true
        setDetail(cached)
        setLoading(false)
        setRefreshing(true)
      })
      // Long lists (sites with a chapter pager) arrive in pieces: show each piece as soon as it's read.
      offPartial = window.api.onSeriesPartial((d) => {
        if (cancelled || gotFresh || d.url !== entry.url) return
        setDetail((prev) => (prev && prev.chapters.length >= d.chapters.length ? prev : d))
        setExpected(d.expected)
        setFound(d.chapters.length)
        setPartial(true)
        setLoading(false)
        setRefreshing(true)
      })
      const res = await window.api.getSeries(entry.sourceId, entry.url, mode)
      if (cancelled) return
      gotFresh = true
      setRefreshing(false)
      setPartial(false)
      setExpected(undefined)
      if (res.ok) {
        setDetail(res.data)
        return setLoading(false)
      }
      const rep = await window.api.sourceFailed(entry.sourceId, res.error)
      if (haveCached) {
        setRefreshError(res.error) // keep showing the saved list, but say why it couldn't be updated
        return
      }
      // Couldn't reach the site: another site with this title, or the chapters saved on this PC.
      const saved = (await window.api.downloadList())
        .filter((i) => i.seriesUrl === entry.url && i.status === 'done')
        .sort((a, b) => chapterNumber(b.chapterTitle) - chapterNumber(a.chapterTitle))
      if (cancelled) return
      if (saved.length === 0 && rep.outOfRotation && (await goAlt())) return
      setLoading(false)
      if (saved.length > 0) {
        setOffline(true)
        setDetail({
          url: entry.url,
          title: series.title,
          cover: series.cover,
          description: '',
          chapters: saved.map((i) => ({ title: i.chapterTitle, url: i.id }))
        })
      } else setError(res.error)
    })()
    return () => {
      cancelled = true
      offPartial()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.sourceId, entry.url, series.title, series.cover, attempt, pinReady])

  // Once the list is complete, ask your other sites for the chapters it lacks.
  useEffect(() => {
    setFills([])
    if (!detail || refreshing || partial || offline || detail.chapters.length < 2) return
    let cancelled = false
    void window.api
      .fillGaps(series.title, entry.sourceId, detail.chapters)
      .then((f) => !cancelled && setFills(f))
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail, refreshing, partial, offline, entry.sourceId, series.title])

  const referer = new URL(entry.url).origin + '/'
  // the site's own chapters with the filled ones slotted in by number, newest first
  const merged: Ch[] = (() => {
    if (!detail) return []
    if (fills.length === 0) return detail.chapters
    const all = [...detail.chapters, ...fills].map((c, i) => ({ c, n: numberOrNone(c.title), i }))
    all.sort((a, b) => b.n - a.n || a.i - b.i)
    return all.map((x) => x.c)
  })()
  const chapters = newestFirst ? merged : [...merged].reverse()
  const refererOf = (c: Ch): string => (c.fill ? new URL(c.url).origin + '/' : referer)
  const readSet = new Set(progress?.read ?? [])

  const open = (c: Ch): void => {
    if (!detail) return
    onRead({
      url: c.url,
      title: c.title,
      chapters: merged,
      referer: refererOf(c),
      seriesUrl: entry.url,
      sourceId: entry.sourceId
    })
  }

  const request = (c: Ch): DownloadRequest => ({
    chapterUrl: c.url,
    alts: c.alts,
    chapterTitle: c.title,
    seriesUrl: entry.url,
    seriesTitle: series.title,
    sourceId: c.fill ?? entry.sourceId,
    referer: refererOf(c)
  })

  // Oldest first, so the queue fills in reading order.
  const downloadMany = (list: Ch[], which: 'unread' | 'all'): void => {
    const todo = [...list].reverse().filter((c) => !['done', 'queued', 'downloading'].includes(dls[c.url]?.status ?? ''))
    if (todo.length === 0) return
    const ask =
      which === 'unread'
        ? t('Download {n} chapters (unread)? This can take a while and use disk space.', { n: num(todo.length) })
        : t('Download {n} chapters (all)? This can take a while and use disk space.', { n: num(todo.length) })
    if (todo.length > 40 && !confirm(ask)) return
    void window.api.downloadEnqueue(todo.map(request))
  }

  const dlButton = (c: Ch): React.JSX.Element | null => {
    if (offline) return null
    const d = dls[c.url]
    if (!d) return (
      <button className="dl" title={t('Download for offline')} onClick={() => window.api.downloadEnqueue([request(c)])}>
        ⬇
      </button>
    )
    if (d.status === 'done') return (
      <button className="dl done" title={t('Saved on this PC. Click to delete the download')} onClick={() => window.confirm(t('Delete the saved copy of "{title}" from this PC?', { title: c.title })) && window.api.downloadRemove(d.id)}>
        ✓
      </button>
    )
    if (d.status === 'error') return (
      <button className="dl bad" title={t('{error}. Click to retry', { error: d.error ?? t('Failed') })} onClick={() => window.api.downloadEnqueue([request(c)])}>
        ↻
      </button>
    )
    return (
      <button className="dl busy" title={t('Click to cancel')} onClick={() => window.api.downloadCancel(d.id)}>
        {d.status === 'queued' ? '…' : `${d.done}/${d.total || '?'}`}
      </button>
    )
  }

  // "Continue" resumes the last chapter you opened. If you had finished it, go to the next one.
  // The list is stored newest-first, so "next" is the previous index.
  // (filled-in chapters count too: Continue, Start and "Download unread / all" walk the merged list)
  const list = merged
  const lastIdx = progress ? list.findIndex((c) => c.url === progress.chapterUrl) : -1
  let resume: Ch | undefined
  let resumeNote = ''
  if (lastIdx >= 0) {
    const finished = readSet.has(list[lastIdx].url)
    if (finished && lastIdx > 0) {
      resume = list[lastIdx - 1]
      resumeNote = t('next chapter')
    } else if (!finished) {
      resume = list[lastIdx]
      resumeNote = progress && progress.pos > 0.02 ? t('{n}% in', { n: Math.round(progress.pos * 100) }) : ''
    }
  }
  const first = list.length > 0 ? list[list.length - 1] : undefined

  // Get the chapter you're most likely to open (the Continue / Start one) ready before you click it:
  // its page list, and its first images into the image cache.
  const prefetched = useRef('')
  const target = resume ?? first
  useEffect(() => {
    if (!target || offline || prefetched.current === target.url) return
    prefetched.current = target.url
    window.api.prefetchChapter(target.url).then((pages) =>
      pages.forEach((p) => {
        const img = new Image()
        img.src = pageSrc(p, referer)
      })
    )
  }, [target?.url, offline, referer])
  const unread = list.filter((c) => !readSet.has(c.url))
  const scrollBox = useRef<HTMLDivElement>(null)
  const [pinned, setPinned] = useState(false)
  // Esc, Alt + Left, or the mouse's own Back button = Back (unless you are typing in a box)
  useEffect(() => {
    const k = (e: KeyboardEvent): void => {
      if ((e.target as HTMLElement).closest('input, textarea, select')) return
      if (e.key === 'Escape' || (e.altKey && e.key === 'ArrowLeft')) onBack()
    }
    const m = (e: MouseEvent): void => {
      if (e.button === 3) {
        e.preventDefault()
        onBack()
      }
    }
    window.addEventListener('keydown', k)
    window.addEventListener('mouseup', m)
    return () => {
      window.removeEventListener('keydown', k)
      window.removeEventListener('mouseup', m)
    }
  }, [onBack])

  return (
    <div className="series" ref={scrollBox} onScroll={(e) => setPinned(e.currentTarget.scrollTop > 280)}>
      {/* once the header is scrolled away, a slim bar with Back stays at the top */}
      <div className="pinback-wrap">
        <div className={`pinback${pinned ? ' on' : ''}`} aria-hidden={!pinned}>
          <button className="back" onClick={onBack} tabIndex={pinned ? 0 : -1}>
            <Icon name="back" /> {t('Back to {screen}', { screen: t(backLabel) })}
          </button>
          <span className="pintitle">{series.title}</span>
          <button className="secondary" tabIndex={pinned ? 0 : -1} onClick={() => scrollBox.current?.scrollTo({ top: 0, behavior: 'smooth' })}>
            {t('↑ Top')}
          </button>
        </div>
      </div>
      <div className="head">
        <div className="cover big">
          {(series.cover || detail?.cover) && (
            <img
              src={coverSrc(series.cover || detail!.cover, series.coverReferer)}
              onError={(e) => fallbackCover(e, series.coverFallback || detail?.cover, series.coverReferer)}
            />
          )}
        </div>
        <div className="info">
          <button className="back" onClick={onBack} title="Esc">
            <Icon name="back" /> {t('Back to {screen}', { screen: t(backLabel) })}
          </button>
          <Tags detail={detail} />
          <h2>{series.title}</h2>
          <MalLine title={series.title} />
          {entries.length > 1 && (
            <div className="srcs">
              {t('Read from:')}{' '}
              {entries.map((e, i) => {
                const sp = speeds[e.sourceId]
                return (
                  <button
                    key={e.url}
                    className={i === entryIdx ? 'on' : ''}
                    title={[speedTitle(sp), pinnedId === e.sourceId ? t('opens from here first (your pick)') : '']
                      .filter(Boolean)
                      .join(' · ')}
                    onClick={() => {
                      forced.current = true
                      switched.current = false
                      setSwitchNote('')
                      setEntryIdx(i)
                      setPinnedId(e.sourceId)
                      void window.api.pinSite(series.title, e.sourceId)
                    }}
                  >
                    {sp && <span className={`rdot ${sp.label}`} aria-hidden="true" />}
                    {e.sourceName}
                    {(sp?.lang === 'ar' || sp?.lang === 'en') && (
                      <small className="rlang" title={sp.lang === 'ar' ? t('Arabic') : t('English')}>
                        {sp.lang.toUpperCase()}
                      </small>
                    )}
                    {sp?.ms !== undefined && <small className="rspeed">{t('{s} s', { s: (sp.ms / 1000).toFixed(1) })}</small>}
                    {pinnedId === e.sourceId && <small className="rstar"> ★</small>}
                  </button>
                )
              })}
              {pinnedId && (
                <button
                  className="prefbtn"
                  title={t('Forget your pick: Yomi opens it from where you last read, else the fastest site')}
                  onClick={() => {
                    setPinnedId(undefined)
                    void window.api.unpinSite(series.title)
                  }}
                >
                  {t('Let Yomi choose')}
                </button>
              )}
            </div>
          )}
          {switchNote && <div className="sub">{switchNote}</div>}
          {offline && <p className="desc">{t("Can't reach the site, so this shows only the chapters saved on this PC.")}</p>}
          {story && story.key === storyKey && story.text && (
            <p className="desc" dir="auto">
              {story.text}
              {story.from && <small className="storyfrom"> · {t('from {site}', { site: story.from })}</small>}
            </p>
          )}
          {detail && (resume || first) && (
            <div className="resume">
              {resume ? (
                <button className="primary" onClick={() => open(resume!)}>
                  {t('▶ Continue: {chapter}', { chapter: resume.title })}
                  {resumeNote && <small> ({resumeNote})</small>}
                </button>
              ) : (
                first && (
                  <button className="primary" onClick={() => open(first)}>
                    {t('▶ Start: {chapter}', { chapter: first.title })}
                  </button>
                )
              )}
              {readSet.size > 0 && (
                <span className="count">
                  {t('{n} / {total} read', {
                    n: num([...readSet].filter((u) => list.some((c) => c.url === u)).length),
                    total: num(list.length)
                  })}
                </span>
              )}
            </div>
          )}
          {detail && (
            <div className="resume">
              <button className={`mini big${follow?.following ? ' on' : ''}`} onClick={toggleFollow} title={t('Follow to be told about new chapters')}>
                {follow?.following ? t('✓ Following') : t('☆ Follow')}
              </button>
              <button
                className="mini big"
                title={t('Copy a link to this series with where you are. Paste it in Discord, Telegram or WhatsApp and it shows a clickable card')}
                onClick={async () => {
                  setShareNote(t('Making link…'))
                  try {
                    await navigator.clipboard.writeText(await createShareLink(shareInfo()))
                    setShareNote(t('✓ Link copied. Paste it in any chat'))
                  } catch {
                    setShareNote(t("Couldn't make the link. Check your internet and try again"))
                  }
                  setTimeout(() => setShareNote(''), 4000)
                }}
              >
                {t('↗ Share')}
              </button>
              {shareNote && <span className="count">{shareNote}</span>}
              {follow && follow.unread > 0 && <span className="count">{t('{n} new', { n: num(follow.unread) })}</span>}
            </div>
          )}
          {detail && <AniListLinkPanel seriesUrl={entry.url} title={detail.title || series.title} />}
          {onOpen && <SimilarRow title={series.title} seriesUrl={entry.url} onOpen={onOpen} />}
          {detail && !offline && list.length > 0 && (
            <div className="resume">
              <button className="mini big" onClick={() => downloadMany(unread, 'unread')}>
                {t('⬇ Download unread ({n})', { n: num(unread.length) })}
              </button>
              <button className="mini big" onClick={() => downloadMany(list, 'all')}>
                {t('⬇ Download all ({n})', { n: num(list.length) })}
              </button>
            </div>
          )}
        </div>
      </div>

      {(loading || (refreshing && partial)) && (
        <ChapterProgress site={entry.sourceName} found={found} expected={expected} since={loadStart} />
      )}
      {error && (
        <div className="error">
          {error}{' '}
          <button className="mini" onClick={() => reload('auto')}>
            {t('Try again')}
          </button>
        </div>
      )}
      {detail && (
        <>
          <div className="meta">
            {refreshing
              ? t('{n} chapters · updating…', { n: num(detail.chapters.length) })
              : t('{n} chapters', { n: num(detail.chapters.length) })}{' '}
            <button className="mini" onClick={() => setNewestFirst(!newestFirst)}>
              {newestFirst ? t('newest first') : t('oldest first')}
            </button>
            {!offline && (
              <>
                <button className="mini" disabled={refreshing} onClick={() => reload('check')} title={t('Look for chapters added since the list was saved')}>
                  {t('Check for new chapters')}
                </button>
                <button
                  className="mini"
                  disabled={refreshing}
                  onClick={() => confirm(t('Read the whole chapter list again? This takes longer and uses more of the site.')) && reload('full')}
                  title={t('Read the complete chapter list again')}
                >
                  {t('Reload full list')}
                </button>
              </>
            )}
          </div>
          {detail.incomplete && !refreshing && (
            <div className="error small">
              {t('This list looks too short for the newest chapter, so some chapters may be missing.')}{' '}
              <button className="mini" onClick={() => reload('full')}>
                {t('Reload full list')}
              </button>
            </div>
          )}
          {refreshError && (
            <div className="error small">
              {t("Showing the saved list. Couldn't check for new chapters: {error}", { error: refreshError })}{' '}
              <button className="mini" onClick={() => reload('check')}>
                {t('Try again')}
              </button>
            </div>
          )}
          {detail.chapters.length === 0 && !refreshing && (
            <div className="hint">
              {t("No chapters found on this page. The site may load them in a way the app can't see yet.")}{' '}
              <button className="mini" onClick={() => reload('full')}>
                {t('Try again')}
              </button>
            </div>
          )}
          <div className="chapters">
            {chapters.map((c) => (
              <div
                key={c.url}
                className={`chapterwrap${readSet.has(c.url) ? ' read' : ''}${progress?.chapterUrl === c.url ? ' current' : ''}`}
              >
                <button className="chapter" onClick={() => open(c)}>
                  {readSet.has(c.url) ? '✓ ' : ''}
                  {c.title}
                  {newKeys.has(chapterKey(c.title)) && !readSet.has(c.url) && <span className="newtag">{t('NEW')}</span>}
                  {c.fill && (
                    <span
                      className="filltag"
                      title={t("{site} doesn't have this chapter. It is read from {other}.", { site: entry.sourceName, other: c.fillName ?? '' })}
                    >
                      {t('from {site}', { site: c.fillName ?? '' })}
                    </span>
                  )}
                </button>
                {dlButton(c)}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Shows that the chapter list is still being collected, so a long wait never looks like the app is stuck: a bar that
 * fills up when the site says how many chapters there are (otherwise one that keeps moving), how many were found so
 * far, and the time it has taken.
 */
function ChapterProgress({ site, found, expected, since }: { site: string; found: number; expected?: number; since: number }): React.JSX.Element {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  const secs = Math.max(0, Math.round((now - since) / 1000))
  const time = secs < 60 ? t('{s} s', { s: secs }) : t('{m} min {s} s', { m: Math.floor(secs / 60), s: secs % 60 })
  const pct = expected && expected > 0 ? Math.min(99, Math.round((found / expected) * 100)) : null
  return (
    <div className="chprog" role="status" aria-live="polite">
      <div className="chprog-top">
        <span>
          {found === 0
            ? t('Reading the chapter list from {site}…', { site })
            : expected
              ? t('Loading chapters from {site}… {n} of {total}', { site, n: num(found), total: num(expected) })
              : t('Loading chapters from {site}… {n} found so far', { site, n: num(found) })}
        </span>
        <span className="chprog-time">
          {pct !== null ? `${pct}% · ` : ''}
          {time}
        </span>
      </div>
      <div className={`chprog-bar${pct === null ? ' moving' : ''}`}>
        <span style={pct !== null ? { width: `${pct}%` } : undefined} />
      </div>
      {(found > 0 || secs >= 15) && (
        <div className="chprog-note">
          {found > 0 ? t('You can already open the chapters shown below.') + ' ' : ''}
          {secs >= 15 ? t('Long series can take a few minutes the first time; after that they open straight away.') : ''}
        </div>
      )}
    </div>
  )
}
