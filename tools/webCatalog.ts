/*
 * The web version's shared catalog, built from a copy of the app's data folder: the sites the web version supports,
 * their titles, and every title grouped across sites (what the search reads). Uses the app's own rules (src/core) so
 * a title is grouped, named and typed the same way as in the app.
 */
import { normalizeTitle } from '../src/core/repair.ts'
import { canonGenres, upgradeCover } from '../src/core/staticParse.ts'

/** The sites that work on the web version (tested: plain requests, Cloudflare's servers, pictures). In this order. */
export const WEB_SITES: { id: string; imageProxy?: boolean }[] = [
  { id: 'mangafreak' },
  { id: 'mangapill-com', imageProxy: true },
  { id: 'webtoonclub-com' },
  { id: 'kuramanga-com' },
  { id: 'projectsuki-com' },
  { id: 'azorafly-com' },
  { id: 'olympustaff-com' },
  { id: 'mangadar-com' }
]

type Kind = 'manga' | 'manhwa' | 'manhua'

interface AppCatalog {
  sources: { id: string; name: string; baseUrl: string; chapterRe?: string; lang?: string }[]
  series: Record<string, { url: string; title: string; cover?: string }[]>
}
type AppMeta = Record<string, { type?: Kind; genres?: string[] }>
type AppGenreIndex = Record<
  string,
  { genres?: string[]; map?: Record<string, number[]>; types?: Record<string, Kind> }
>

export interface SiteRow {
  id: string
  name: string
  base_url: string
  lang: 'ar' | 'en' | 'other'
  chapter_re: string
  image_proxy: boolean
  sort_order: number
  title_count: number
}
export interface TitleRow {
  site_id: string
  url: string
  title: string
  cover: string
  title_key: string
}
export interface GroupRow {
  title_key: string
  title: string
  cover: string
  cover_fallback: string
  cover_referer: string
  entries: { sourceId: string; sourceName: string; url: string }[]
  site_ids: string[]
  n_sites: number
  kind: Kind | null
  genres: string[]
  mix: number
  pos: number
}

/** Same as the app's urlKey (genres.ts): www., trailing slash and case don't matter. */
export function urlKey(u: string): string {
  const m = /^https?:\/\/([a-z0-9.-]+)(\/[^?#\\]*)?(?:[?#].*)?$/i.exec(u)
  if (m && !/%|\/\.\.?(?:\/|$)/.test(m[2] ?? ''))
    return (m[1].replace(/^www\./i, '') + (m[2] ?? '').replace(/\/+$/, '')).toLowerCase()
  try {
    const x = new URL(u)
    return (
      x.hostname.replace(/^www\./, '') + decodeURIComponent(x.pathname).replace(/\/+$/, '')
    ).toLowerCase()
  } catch {
    return u.toLowerCase()
  }
}

/** A fixed number per title for the "mixed" order (FNV-1a). */
function mixOf(key: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h | 0
}

const clip = (s: string, n: number): string => (s.length > n ? s.slice(0, n) : s)
const httpsOnly = (u: string): string => (/^https:\/\//.test(u) ? u : '')

export function buildWebCatalog(
  cat: AppCatalog,
  meta: AppMeta = {},
  genreIndex: AppGenreIndex = {}
): { sites: SiteRow[]; titles: TitleRow[]; groups: GroupRow[] } {
  const sites: SiteRow[] = []
  const titles: TitleRow[] = []
  const groups = new Map<string, GroupRow & { metaGenres: Set<string>; scanGenres: Set<string> }>()

  WEB_SITES.forEach((w, order) => {
    const src = cat.sources.find((s) => s.id === w.id)
    if (!src) return
    const base = new URL(src.baseUrl).origin + '/'
    const host = new URL(base).hostname
    const hostKind: Kind | null = /manhwa/i.test(host)
      ? 'manhwa'
      : /manhua/i.test(host)
        ? 'manhua'
        : null
    const gi = genreIndex[src.id] ?? {}
    let count = 0
    const seen = new Set<string>()
    ;(cat.series[src.id] ?? []).forEach((e, pos) => {
      if (!/^https:\/\//.test(e.url) || e.url.length > 600 || seen.has(e.url)) return
      const title = clip((e.title || '').replace(/\s+/g, ' ').trim(), 300)
      const key = clip(normalizeTitle(title), 300)
      if (!title || !key) return
      seen.add(e.url)
      count++
      const cover = clip(httpsOnly(e.cover ?? ''), 1000)
      titles.push({ site_id: src.id, url: e.url, title, cover, title_key: key })
      const k = urlKey(e.url)
      const m = meta[e.url] ?? meta[e.url.replace(/\/$/, '')] ?? meta[e.url + '/']
      const kind: Kind | null = m?.type ?? gi.types?.[k] ?? hostKind
      const fromMeta = canonGenres(m?.genres ?? [])
      const fromScan = canonGenres(
        (gi.map?.[k] ?? []).map((i) => gi.genres?.[i] ?? '').filter(Boolean)
      )
      const entry = { sourceId: src.id, sourceName: src.name, url: e.url }
      const g = groups.get(key)
      if (!g) {
        groups.set(key, {
          title_key: key,
          title,
          cover: cover ? clip(httpsOnly(upgradeCover(cover)), 1000) : '',
          cover_fallback: cover,
          cover_referer: cover ? base : '',
          entries: [entry],
          site_ids: [src.id],
          n_sites: 1,
          kind,
          genres: [],
          mix: mixOf(key),
          pos,
          metaGenres: new Set(fromMeta),
          scanGenres: new Set(fromScan)
        })
        return
      }
      if (g.entries.length < 40 && !g.site_ids.includes(src.id)) {
        g.entries.push(entry)
        g.site_ids.push(src.id)
        g.n_sites++
      }
      if (!g.cover && cover) {
        g.cover = clip(httpsOnly(upgradeCover(cover)), 1000)
        g.cover_fallback = cover
        g.cover_referer = base
      }
      if (!g.kind && kind) g.kind = kind
      for (const x of fromMeta) g.metaGenres.add(x)
      for (const x of fromScan) g.scanGenres.add(x)
    })
    sites.push({
      id: src.id,
      name: clip(src.name, 80),
      base_url: base,
      lang: src.lang === 'ar' ? 'ar' : src.lang === 'other' ? 'other' : 'en',
      chapter_re: clip(src.chapterRe ?? '', 500),
      image_proxy: !!w.imageProxy,
      sort_order: order,
      title_count: count
    })
  })

  const out: GroupRow[] = []
  for (const g of groups.values()) {
    const { metaGenres, scanGenres, ...row } = g
    // what a series' own page said wins over the genre scan, like in the app
    row.genres = [...(metaGenres.size ? metaGenres : scanGenres)].slice(0, 30)
    out.push(row)
  }
  return { sites, titles, groups: out }
}
