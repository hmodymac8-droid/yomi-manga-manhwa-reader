import { useEffect, useState } from 'react'
import type { MalInfo, MalTopKind, SearchHit } from '../../../preload/index.d'
import type { OpenSeries } from '../lib'
import { HitCard } from './Similar'
import { useRowFit } from '../useRowFit'

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })

/** "MyAnimeList ★ 8.54 · #150 · 632K readers" under a series' tags; opens the MyAnimeList page. */
export function MalLine({ title }: { title: string }): React.JSX.Element | null {
  // the answer remembers which title it is for, so a new series never shows the previous one's score
  const [got, setGot] = useState<{ for: string; info: MalInfo | null }>({ for: '', info: null })
  useEffect(() => {
    let cancelled = false
    if (!title) return
    void window.api
      .malInfo(title)
      .then((info) => !cancelled && setGot({ for: title, info }))
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [title])
  const info = got.for === title ? got.info : null
  if (!info) return null
  const bits = [
    info.score ? `★ ${info.score}` : '',
    info.rank ? `Ranked #${info.rank.toLocaleString()}` : '',
    info.members ? `${compact.format(info.members)} readers` : ''
  ].filter(Boolean)
  if (bits.length === 0) return null
  return (
    <a
      className="malline"
      href={info.url}
      target="_blank"
      rel="noreferrer"
      title={[
        info.score &&
          `Score ${info.score}${info.scoredBy ? ` from ${info.scoredBy.toLocaleString()} people` : ''}`,
        info.rank && `Ranked #${info.rank.toLocaleString()} on MyAnimeList`,
        info.popularity && `#${info.popularity.toLocaleString()} most popular`,
        'Click to open it on MyAnimeList'
      ]
        .filter(Boolean)
        .join('\n')}
    >
      <b>MyAnimeList</b>
      {bits.map((b) => (
        <span key={b}>{b}</span>
      ))}
    </a>
  )
}

const KINDS: { kind: MalTopKind; label: string }[] = [
  { kind: 'popular', label: 'Most popular' },
  { kind: 'manhwa', label: 'Manhwa' },
  { kind: 'manga', label: 'Manga' },
  { kind: 'manhua', label: 'Manhua' }
]

const savedKind = (): MalTopKind => {
  const k = localStorage.getItem('malTop.kind')
  return KINDS.some((x) => x.kind === k) ? (k as MalTopKind) : 'popular'
}

/** "Top on MyAnimeList" for Discover: its top lists, kept to the titles on your sites (so every card opens). */
export function MalTopRow({
  onOpen
}: {
  onOpen: (s: OpenSeries) => void
}): React.JSX.Element | null {
  const [kind, setKind] = useState<MalTopKind>(savedKind)
  const [rows, setRows] = useState<
    Partial<Record<MalTopKind, { hit: SearchHit; score: string; rank: number }[]>>
  >({})
  useEffect(() => {
    let cancelled = false
    if (rows[kind]) return
    void window.api
      .malTop(kind)
      .then((r) => {
        if (cancelled) return
        setRows((o) => ({ ...o, [kind]: r }))
        // the list you picked last time has nothing on your sites: fall back to the most popular one
        if (r.length === 0 && kind !== 'popular' && !rows.popular) setKind('popular')
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [kind, rows])
  const list = rows[kind]
  // one row that fits the window; "Show all" opens the whole list as a grid
  const [all, setAll] = useState(false)
  const [rowRef, cols] = useRowFit()
  // nothing on your sites from any list asked so far (or MyAnimeList is off): no row at all
  if (!list || (list.length === 0 && Object.values(rows).every((r) => !r || r.length === 0)))
    return null
  return (
    <section className="continue similar maltop">
      <div className="meta">
        Top on MyAnimeList
        <span className="maltabs" role="tablist">
          {KINDS.map((k) => (
            <button
              key={k.kind}
              role="tab"
              aria-selected={k.kind === kind}
              className={k.kind === kind ? 'on' : ''}
              onClick={() => {
                localStorage.setItem('malTop.kind', k.kind)
                setKind(k.kind)
              }}
            >
              {k.label}
            </button>
          ))}
        </span>
        {list.length > 0 && (all || list.length > cols) && (
          <button className="mini fitmore" onClick={() => setAll(!all)}>
            {all ? 'Show fewer' : `Show all ${list.length}`}
          </button>
        )}
      </div>
      {list.length > 0 ? (
        <div ref={rowRef} className={all ? 'fitgrid' : 'fitrow'}>
          {list.map((r) => (
            <HitCard
              key={r.hit.key}
              h={r.hit}
              onOpen={onOpen}
              note={[`#${r.rank}`, r.score && `★ ${r.score}`].filter(Boolean).join(' · ')}
            />
          ))}
        </div>
      ) : (
        <div className="hint2">None of these are on your sites yet.</div>
      )}
    </section>
  )
}
