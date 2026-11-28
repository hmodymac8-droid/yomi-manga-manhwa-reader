import type { SeriesDetail } from '../../../preload/index.d'
import { t } from '../i18n'

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)

/** A genre in the window's language: by the name the app keeps for it, or the same name in sentence case ("Slow burn"). */
const genreName = (g: string): string => {
  for (const k of [g, cap(g.toLowerCase())]) {
    const shown = t(k)
    if (shown !== k) return shown
  }
  return g
}

/** Type, genre and status pills, shown only for what the series page actually told us. */
export function Tags({ detail, max = 6 }: { detail: Pick<SeriesDetail, 'type' | 'genres' | 'status'> | null | undefined; max?: number }): React.JSX.Element | null {
  if (!detail) return null
  const list = [
    ...(detail.type ? [t(cap(detail.type))] : []),
    ...(detail.genres ?? []).slice(0, max).map(genreName),
    ...(detail.status ? [t(cap(detail.status))] : [])
  ]
  if (list.length === 0) return null
  return (
    <div className="tags">
      {list.map((tag) => (
        <span key={tag} className="tag">
          {tag}
        </span>
      ))}
    </div>
  )
}
