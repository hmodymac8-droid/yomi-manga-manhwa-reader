import { useCallback, useEffect, useState } from 'react'
import GenreProgress from './GenreProgress'
import DeleteSite from './DeleteSite'
import type { SiteHealth, SiteWatchSite, SiteWatchStatus, SourceInfo } from '../../../preload/index.d'
import { ago, num, t } from '../i18n'

type Level = 'ok' | 'warn' | 'fail' | 'unknown'

/** One word for the site: the last Re-check if there is one, otherwise how your recent series opens went. */
export function levelOf(h: SiteHealth | undefined): Level {
  if (!h) return 'unknown'
  if (h.availability === 'down') return 'fail'
  if (h.availability === 'degraded') return 'warn'
  const opens = h.ok + h.incomplete + h.failed
  if (h.check) {
    const fresh = h.lastAt <= h.check.at // no series opened since the check
    if (h.check.overall === 'fail') return 'fail'
    if (!fresh && opens >= 3 && h.failed / opens > 0.5) return 'fail'
    if (h.check.overall === 'warn') return 'warn'
    if (!fresh && opens >= 3 && (h.failed + h.incomplete) / opens > 0.3) return 'warn'
    return 'ok'
  }
  if (opens === 0) return 'unknown'
  if (h.failed / opens > 0.5) return 'fail'
  if ((h.failed + h.incomplete) / opens > 0.3) return 'warn'
  return 'ok'
}

const LABEL: Record<Level, string> = { ok: 'Working', warn: 'Needs a look', fail: 'Broken', unknown: 'Not checked yet' }

/** What the daily check found, in your language (the step's name too; its technical detail stays as the site gave it). */
function whyText(x: SiteWatchSite): string {
  if (x.fixed) return t(x.fixed)
  const vars = x.vars?.step ? { ...x.vars, step: t(x.vars.step) } : x.vars
  return t(x.tpl, vars)
}

export default function Sites({ onBack }: { onBack: () => void }): React.JSX.Element {
  const [all, setSources] = useState<SourceInfo[]>([])
  const sources = all.filter((s) => !s.hidden)
  const hiddenCount = all.length - sources.length
  const [deleting, setDeleting] = useState<SourceInfo | null>(null)
  const remove = async (s: SourceInfo): Promise<void> => {
    setDeleting(null)
    await window.api.removeSite(s.id)
    void refresh()
  }
  const [health, setHealth] = useState<Record<string, SiteHealth>>({})
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const [open, setOpen] = useState<Record<string, boolean>>({})

  const refresh = useCallback(async () => {
    const [s, h] = await Promise.all([window.api.listSources(), window.api.siteHealth()])
    setSources(s)
    setHealth(Object.fromEntries(h.map((x) => [x.sourceId, x])))
  }, [])

  useEffect(() => {
    void refresh()
    const t = setInterval(() => void refresh(), 4000) // titles keep arriving while a scan runs
    return () => clearInterval(t)
  }, [refresh])

  const check = async (id: string): Promise<void> => {
    setBusy((b) => ({ ...b, [id]: true }))
    try {
      const h = await window.api.siteCheck(id)
      setHealth((prev) => ({ ...prev, [id]: h }))
      setOpen((o) => ({ ...o, [id]: true }))
    } finally {
      setBusy((b) => ({ ...b, [id]: false }))
    }
  }

  const [gstat, setGstat] = useState<Awaited<ReturnType<typeof window.api.genreStatus>> | null>(null)
  const refreshGenres = (): void => void window.api.genreStatus().then(setGstat)
  useEffect(() => {
    refreshGenres()
    const t = setInterval(refreshGenres, 4000)
    return () => clearInterval(t)
  }, [])

  // The daily check (runs by itself once a day; "Check all now" starts it at once)
  const [watch, setWatch] = useState<SiteWatchStatus | null>(null)
  useEffect(() => {
    const load = (): void => void window.api.watchStatus().then(setWatch)
    load()
    const off = window.api.onWatch(() => {
      load()
      void refresh()
    })
    return off
  }, [refresh])
  const checkAll = (): void => void window.api.watchRun()

  const anyBusy = Object.values(busy).some(Boolean) || !!watch?.progress
  const order: Record<Level, number> = { fail: 0, warn: 1, unknown: 2, ok: 3 }
  const rows = [...sources].sort((a, b) => order[levelOf(health[a.id])] - order[levelOf(health[b.id])])

  return (
    <div className="series">
      <div className="pagehead">
        <div>
          <div className="kicker">サイト</div>
          <h1>{t('Sites')}</h1>
          <p>
            {t('{n} sites · {titles} titles merged.', {
              n: num(sources.length),
              titles: num(sources.reduce((n, s) => n + s.count, 0))
            })}{' '}
            {t("Re-check tests a site like you would use it: title list, a chapter list, a chapter's pages and one image.")}
          </p>
        </div>
        <div className="pageact">
          <button onClick={checkAll} disabled={anyBusy || sources.length === 0}>
            {watch?.progress ? t('Checking…') : t('Check all now')}
          </button>
          <button className="primary" onClick={onBack}>
            {t('Add site')}
          </button>
        </div>
      </div>
      <WatchSummary watch={watch} />
      <GenreProgress startOpen />
      {hiddenCount > 0 && (
        <div className="sub" style={{ margin: '0 8px 12px' }}>
          {t(
            hiddenCount === 1
              ? '{n} Yomi Library site is hidden. Turn on "Show the Yomi Library" in Settings to see it.'
              : '{n} Yomi Library sites are hidden. Turn on "Show the Yomi Library" in Settings to see them.',
            { n: num(hiddenCount) }
          )}
        </div>
      )}
      {sources.length === 0 && <div className="hint">{t('No sites yet. Add one from the main screen.')}</div>}
      {rows.map((s) => {
        const h = health[s.id]
        const level = levelOf(h)
        const opens = h ? h.ok + h.incomplete + h.failed : 0
        return (
          <div className="siterow" key={s.id}>
            <div className="sitehead">
              <span className={'dot ' + level} title={t(LABEL[level])} />
              <div className="sitename">
                <b>{s.name}</b>
                <span className="sub">{s.baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
              </div>
              <span className={'lvl ' + level}>{t(LABEL[level])}</span>
              <DayStrip days={watch?.sites[s.id]?.days} />
              <span className="sub">
                {t('{n} titles', { n: num(s.count) })}
                {s.crawling ? ` · ${t('scanning…')}` : ''}
              </span>
              <span className="sub genrestat">
                {gstat?.progress[s.id] ??
                  (gstat?.sites[s.id]?.running
                    ? t('reading genres…')
                    : gstat?.sites[s.id]
                      ? gstat.sites[s.id].titles > 0
                        ? t('genres: {genres} · {titles} titles tagged · {when}', {
                            genres: num(gstat.sites[s.id].genres),
                            titles: num(gstat.sites[s.id].titles),
                            when: ago(gstat.sites[s.id].at)
                          })
                        : t('no genre pages this site lets the app read')
                      : t('genres: not read yet'))}
              </span>
              <span className="grow" />
              <button className="mini" onClick={() => setOpen((o) => ({ ...o, [s.id]: !o[s.id] }))}>
                {open[s.id] ? t('Hide details') : t('Details')}
              </button>
              <button className="mini" disabled={s.crawling} onClick={() => void window.api.crawl(s.id)}>
                {t('Re-scan titles')}
              </button>
              <button
                className="mini"
                disabled={!!gstat && Object.values(gstat.sites).some((x) => x.running)}
                title={t("Read this site's genre pages now, so its titles can be filtered by genre")}
                onClick={() => void window.api.genreScanNow(s.id).then(() => setTimeout(refreshGenres, 800))}
              >
                {t('Read genres')}
              </button>
              <button className="mini on" disabled={!!busy[s.id]} onClick={() => void check(s.id)}>
                {busy[s.id] ? t('Checking…') : t('Re-check')}
              </button>
              <button className="mini danger" title={t('Delete this site from Yomi')} onClick={() => setDeleting(s)}>
                {t('Delete')}
              </button>
            </div>
            {watch?.sites[s.id] && (watch.sites[s.id].cause !== 'ok' || watch.sites[s.id].fixed) && (
              <div className={'whyline ' + level}>
                {watch.sites[s.id].fixed && <b>{t('Fixed by itself:')} </b>}
                {whyText(watch.sites[s.id])}
                {watch.sites[s.id].brokeAt && level === 'fail' && (
                  <span className="sub"> · {t('broken since {when}', { when: ago(watch.sites[s.id].brokeAt!) })}</span>
                )}
              </div>
            )}
            {open[s.id] && (
              <div className="sitebody">
                <div className="sub">
                  {opens > 0
                    ? h!.lastAt
                      ? t('Your last {n} series opens: {ok} fine, {cut} cut short, {failed} failed (latest {when})', {
                          n: num(opens),
                          ok: num(h!.ok),
                          cut: num(h!.incomplete),
                          failed: num(h!.failed),
                          when: ago(h!.lastAt)
                        })
                      : t('Your last {n} series opens: {ok} fine, {cut} cut short, {failed} failed', {
                          n: num(opens),
                          ok: num(h!.ok),
                          cut: num(h!.incomplete),
                          failed: num(h!.failed)
                        })
                    : t('No series opened from this site yet.')}
                  {h?.lastError && h.failed > 0 && (
                    <span className="bad"> · {t('last error: {error}', { error: h.lastError })}</span>
                  )}
                </div>
                {h?.availability && h.availability !== 'ok' && (
                  <div className="sub">
                    {h.availability === 'down' ? t('Out of rotation') : t('Unsteady')}
                    {h.reason ? `: ${h.reason}` : ''}
                    {h.failedAt ? ` · ${t('since {when}', { when: ago(h.failedAt) })}` : ''}
                    {h.nextProbeAt
                      ? h.nextProbeAt > Date.now()
                        ? ` · ${t('the old address is tried again in {n} min', { n: Math.max(1, Math.round((h.nextProbeAt - Date.now()) / 60000)) })}`
                        : ` · ${t('the old address is being tried again')}`
                      : ''}
                  </div>
                )}
                {h?.history && h.history.length > 0 && (
                  <div className="sub">
                    {h.history
                      .slice(-5)
                      .reverse()
                      .map((ev) => (
                        <div key={ev.at + ev.reason}>
                          {ago(ev.at)} · {t(ev.availability === 'ok' ? 'back up' : ev.availability)} · {ev.reason}
                        </div>
                      ))}
                  </div>
                )}
                {h?.check ? (
                  <>
                    <div className="sub">{t('Last re-check {when}:', { when: ago(h.check.at) })}</div>
                    {h.check.steps.map((st) => (
                      <div className="step" key={st.name}>
                        <span className={'dot small ' + st.status} />
                        <span className="stepname">{t(st.name)}</span>
                        <span className="stepdetail">{st.detail}</span>
                        <span className="sub">{t('{n} s', { n: (st.ms / 1000).toFixed(1) })}</span>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="sub">{t('Not re-checked yet. Press Re-check.')}</div>
                )}
              </div>
            )}
          </div>
        )
      })}
      {deleting && <DeleteSite site={deleting} onKeep={() => setDeleting(null)} onDelete={() => void remove(deleting)} />}
    </div>
  )
}

/** The daily check at the top of Sites: when it last ran and how the sites did, or how far the run going now is. */
function WatchSummary({ watch }: { watch: SiteWatchStatus | null }): React.JSX.Element | null {
  if (!watch) return null
  const p = watch.progress
  // how the sites did on their last check (the sites the daily check tries; skipped ones aren't counted)
  const last = Object.values(watch.sites).map((x) => x.days.at(-1)?.o)
  const n = (l: 'ok' | 'warn' | 'fail'): number => last.filter((x) => x === l).length
  return (
    <div className="watchsum">
      <b>{t('Daily check')}</b>
      {p ? (
        <span>
          {p.doing && p.doing !== 'checking'
            ? t('Checking {n} of {total}: {site} ({doing})…', {
                n: num(Math.min(p.done + 1, p.total)),
                total: num(p.total),
                site: p.current,
                doing: t(p.doing)
              })
            : t('Checking {n} of {total}: {site}…', {
                n: num(Math.min(p.done + 1, p.total)),
                total: num(p.total),
                site: p.current
              })}
          <span className="watchbar">
            <span style={{ width: `${p.total ? Math.round((p.done / p.total) * 100) : 0}%` }} />
          </span>
        </span>
      ) : watch.finishedAt ? (
        <span>
          {ago(watch.finishedAt)}: {t('{n} working', { n: num(n('ok')) })}
          {n('warn') > 0 && (
            <>
              {' '}
              ·{' '}
              <span className="warn">
                {t(n('warn') === 1 ? '{n} needs a look' : '{n} need a look', { n: num(n('warn')) })}
              </span>
            </>
          )}
          {n('fail') > 0 && (
            <>
              {' '}
              · <span className="fail">{t('{n} broken', { n: num(n('fail')) })}</span>
            </>
          )}
          {!watch.on && ` · ${t('the daily check is off in Settings')}`}
        </span>
      ) : (
        <span>
          {watch.on
            ? t(
                'Every site is tried once a day in the background (it waits while you read). The first run starts a few minutes after Yomi opens.'
              )
            : t('Off in Settings. "Check all now" still runs it once.')}
        </span>
      )}
    </div>
  )
}

/** The last 14 days of a site, one square a day (oldest left). */
function DayStrip({ days }: { days?: { d: string; o: 'ok' | 'warn' | 'fail' }[] }): React.JSX.Element | null {
  if (!days || days.length === 0) return null
  const word = { ok: 'worked', warn: 'half worked', fail: 'broken' }
  return (
    <span className="daystrip" title={t('The daily check, last 14 days')}>
      {days.map((x) => (
        <i key={x.d} className={x.o} title={`${x.d}: ${t(word[x.o])}`} />
      ))}
    </span>
  )
}
