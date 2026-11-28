import { useEffect, useState } from 'react'
import type { ReadingStats } from '../../../preload/index.d'
import { currentLang, isRtl, num, t } from '../i18n'

/** How long, in words a person would use ("3 h 20 min", "45 min"). */
function duration(ms: number): string {
  const min = Math.round(ms / 60000)
  if (min < 60) return t('{n} min', { n: min })
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? t('{h} h {m} min', { h, m }) : t('{n} h', { n: h })
}
// Arabic month and day names with Western digits (plain 'ar' gives Arabic-Indic digits, some Arabic locales another
// calendar); English keeps the computer's own date style.
const dayLabel = (k: string, opts: Intl.DateTimeFormatOptions): string => {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(
    currentLang() === 'ar' ? 'ar-EG-u-nu-latn' : [],
    opts
  )
}

/** Your reading: headline numbers, chapters per day for the last 30 days, top genres and series. */
export default function Stats(): React.JSX.Element {
  const [s, setS] = useState<ReadingStats | null>(null)
  useEffect(() => {
    void window.api.statsGet().then(setS)
  }, [])

  return (
    <div className="series stats">
      <div className="pagehead">
        <div>
          <div className="kicker">統計</div>
          <h1>{t('Your reading')}</h1>
          <p>
            {t(
              'Counted on this computer as you read: each chapter the first time you finish it, and time in the reader.'
            )}
          </p>
        </div>
      </div>
      {!s ? null : s.totalChapters === 0 && s.totalMs < 60000 ? (
        <div className="hint">{t('Nothing yet. Finish a chapter and it shows up here.')}</div>
      ) : (
        <>
          <div className="kpis">
            <Tile
              label={t('This week')}
              value={num(s.weekChapters)}
              unit={s.weekChapters === 1 ? t('chapter') : t('chapters')}
              note={t('{time} reading', { time: duration(s.weekMs) })}
            />
            <Tile
              label={t('Streak')}
              value={num(s.streak)}
              unit={s.streak === 1 ? t('day') : t('days')}
              note={
                s.longestStreak === 1
                  ? t('Longest: 1 day')
                  : t('Longest: {n} days', { n: num(s.longestStreak) })
              }
            />
            <Tile
              label={t('All time')}
              value={num(s.totalChapters)}
              unit={s.totalChapters === 1 ? t('chapter') : t('chapters')}
              note={t('{time} reading', { time: duration(s.totalMs) })}
            />
          </div>
          <DailyChart daily={s.daily} />
          <div className="statcols">
            <MeterList
              title={t('Top genres')}
              sub={t('Last 90 days, by chapters read')}
              rows={s.topGenres.map((g) => ({ name: g.name, n: g.chapters }))}
              empty={t('Genres show up once the series you read have them.')}
            />
            <MeterList
              title={t('Most read')}
              sub={t('Last 90 days')}
              rows={s.topSeries.map((x) => ({ name: x.title, n: x.chapters }))}
              empty=""
            />
          </div>
        </>
      )}
    </div>
  )
}

function Tile({
  label,
  value,
  unit,
  note
}: {
  label: string
  value: string
  unit: string
  note: string
}): React.JSX.Element {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">
        {value} <span>{unit}</span>
      </div>
      <div className="kpi-note">{note}</div>
    </div>
  )
}

/** Chapters per day, one column per day; hover a day for its numbers. */
function DailyChart({ daily }: { daily: ReadingStats['daily'] }): React.JSX.Element {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...daily.map((d) => d.chapters))
  // a round top value for the scale (1, 2, 5, 10, 20, 50…)
  const steps = [1, 2, 5]
  let top = 1
  for (let p = 1; top < max; p *= 10) for (const st of steps) if (top < max) top = st * p
  const W = 600
  const H = 160
  const colW = W / daily.length
  const barW = Math.max(2, colW - 2) // a 2px gap between columns
  const h = hover !== null ? daily[hover] : null
  // The chart always runs left to right (oldest day on the left, as its bars are drawn), also in Arabic; only the
  // words in it are set right to left.
  const uiDir = isRtl() ? 'rtl' : undefined
  return (
    <section className="statcard">
      <div className="statcard-head">
        <h2>{t('Chapters per day')}</h2>
        <span className="sub">{t('Last 30 days')}</span>
      </div>
      <div className="daychart" dir="ltr" onMouseLeave={() => setHover(null)}>
        <div className="daychart-top">{top}</div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={t('Chapters read per day for the last 30 days')}
        >
          <line x1="0" x2={W} y1={0.5} y2={0.5} className="grid" />
          <line x1="0" x2={W} y1={H / 2} y2={H / 2} className="grid" />
          {daily.map((d, i) => {
            const bh = d.chapters === 0 ? 0 : Math.max(3, (d.chapters / top) * (H - 2))
            const x = i * colW + 1
            const r = Math.min(4, barW / 2, bh)
            return (
              <g key={d.day}>
                {bh > 0 && (
                  <path
                    className={`bar${hover === i ? ' on' : ''}`}
                    d={`M${x},${H} V${H - bh + r} Q${x},${H - bh} ${x + r},${H - bh} H${x + barW - r} Q${x + barW},${H - bh} ${x + barW},${H - bh + r} V${H} Z`}
                  />
                )}
                {/* the hover target is the whole column, bigger than the bar */}
                <rect
                  x={i * colW}
                  y={0}
                  width={colW}
                  height={H}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                />
              </g>
            )
          })}
          <line x1="0" x2={W} y1={H - 0.5} y2={H - 0.5} className="base" />
        </svg>
        {h && hover !== null && (
          <div
            className="daytip"
            style={{ left: `${((hover + 0.5) / daily.length) * 100}%` }}
            role="status"
          >
            <b dir={uiDir}>{dayLabel(h.day, { weekday: 'short', month: 'short', day: 'numeric' })}</b>
            <span dir={uiDir}>
              {h.chapters === 1 ? t('1 chapter') : t('{n} chapters', { n: num(h.chapters) })} ·{' '}
              {duration(h.ms)}
            </span>
          </div>
        )}
        {/* the same numbers as a table, for screen readers */}
        <table className="sr-only" dir={uiDir}>
          <caption>{t('Chapters and reading time per day, last 30 days')}</caption>
          <tbody>
            {daily.map((d) => (
              <tr key={d.day}>
                <th scope="row">
                  {dayLabel(d.day, { weekday: 'short', month: 'short', day: 'numeric' })}
                </th>
                <td>{t('{n} chapters', { n: num(d.chapters) })}</td>
                <td>{duration(d.ms)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="daychart-axis">
          <span dir={uiDir}>{dayLabel(daily[0].day, { month: 'short', day: 'numeric' })}</span>
          <span dir={uiDir}>{dayLabel(daily[15].day, { month: 'short', day: 'numeric' })}</span>
          <span dir={uiDir}>{t('Today')}</span>
        </div>
      </div>
    </section>
  )
}

/** A ranked list: name, a bar against the top row, and the number. */
function MeterList({
  title,
  sub,
  rows,
  empty
}: {
  title: string
  sub: string
  rows: { name: string; n: number }[]
  empty: string
}): React.JSX.Element {
  const max = Math.max(1, ...rows.map((r) => r.n))
  return (
    <section className="statcard">
      <div className="statcard-head">
        <h2>{title}</h2>
        <span className="sub">{sub}</span>
      </div>
      {rows.length === 0 ? (
        <p className="sub">{empty}</p>
      ) : (
        <ul className="meters">
          {rows.map((r) => (
            <li key={r.name}>
              <span className="mname" dir="auto" title={r.name}>
                {r.name}
              </span>
              <span className="mbar">
                <span style={{ width: `${(r.n / max) * 100}%` }} />
              </span>
              <span className="mnum">{num(r.n)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
