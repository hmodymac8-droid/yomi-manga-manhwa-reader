/*
 * Reading a series page with plain requests (no browser window): its details and whole chapter list. Shared by the
 * Windows app and the web version; each gives its own way to fetch a page (`get`).
 */
import type { SeriesDetail } from '../preload/index.d'
import { dataChapters, parseMeta, parseSeries } from './staticParse'
import { finalizeChapters, looksIncomplete } from './chapters'

/** Fetches a page: its status, text and the address it ended up at. */
export type GetPage = (
  url: string,
  method?: 'GET' | 'POST'
) => Promise<{ status: number; html: string; finalUrl: string }>

/**
 * Madara sites (a common manga site engine) often load a series' chapter list with a request after the page opens,
 * 50 chapters at a time ("…/ajax/chapters/", then "?t=2", "?t=3"…). Asking for those pieces directly gives the whole
 * list in a second or two, where a browser window would have to click through each page. Null when the page is not
 * like that.
 */
export async function madaraChapters(
  get: GetPage,
  html: string,
  url: string,
  chapterRe: string
): Promise<{ title: string; url: string }[] | null> {
  if (!/wp-manga|madara/i.test(html) || !/manga_id|manga-chapters-holder/i.test(html)) return null
  const base = url.replace(/[?#].*$/, '').replace(/\/?$/, '/') + 'ajax/chapters/'
  const first = await get(base, 'POST').catch(() => null)
  if (!first || first.status !== 200) return null
  const all = [...parseSeries(first.html, url, chapterRe).chapters]
  if (all.length === 0) return null
  // the list's own pager says how many pieces there are
  const last = Math.min(
    200,
    Math.max(
      1,
      ...[...first.html.matchAll(/data-page="(\d+)"|[?&]t=(\d+)/g)].map((m) => Number(m[1] ?? m[2]))
    )
  )
  const rest = Array.from({ length: last - 1 }, (_, i) => i + 2)
  for (let i = 0; i < rest.length; i += 4) {
    const got = await Promise.all(
      rest.slice(i, i + 4).map((n) => get(base + '?t=' + n, 'POST').catch(() => null))
    )
    for (const g of got)
      if (g && g.status === 200) all.push(...parseSeries(g.html, url, chapterRe).chapters)
  }
  return all
}

export async function staticSeries(
  get: GetPage,
  src: { chapterRe: string },
  url: string,
  slug: string
): Promise<SeriesDetail | null> {
  try {
    const r = await get(url)
    if (r.status !== 200) return null
    const madara = await madaraChapters(get, r.html, url, src.chapterRe)
    if (madara) {
      const chapters = finalizeChapters(madara, slug, url)
      if (chapters.length > 0) {
        const p0 = parseSeries(r.html, url, src.chapterRe)
        return {
          url,
          title: p0.title,
          cover: p0.cover,
          description: p0.description,
          ...parseMeta(r.html, url),
          chapters
        }
      }
    }
    const p = parseSeries(r.html, url, src.chapterRe)
    if (p.paged || p.chapters.length === 0) return null
    // Pager links to the same page (…?page=2): this is only the first slice of the list.
    if (
      /href="[^"]*[?&](?:page|chapter_page|chapters_page|cpage)=2(?:&|")/i.test(
        r.html.replace(/&amp;/g, '&')
      )
    )
      return null
    // The static HTML may only hold other series' chapter links (the real list is added by JavaScript).
    const flat = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '')
    if (slug && !p.chapters.some((c) => flat(c.url).includes(slug))) return null
    const chapters = finalizeChapters(
      [...p.chapters, ...dataChapters(r.html, url, p.chapters)],
      slug,
      url
    )
    // The page handed over only a slice (the rest is added by JavaScript after load): not a usable answer.
    if (looksIncomplete(chapters)) return null
    return {
      url,
      title: p.title,
      cover: p.cover,
      description: p.description,
      ...parseMeta(r.html, url),
      chapters
    }
  } catch {
    return null
  }
}
