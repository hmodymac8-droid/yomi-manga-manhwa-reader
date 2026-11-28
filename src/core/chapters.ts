/*
 * Chapter lists, the same for the Windows app and the web version: chapter numbers from names and addresses, one
 * entry per chapter when a site lists several providers, newest first, other series' chapters left out.
 */
import type { SeriesDetail } from '../preload/index.d'
import { dropOtherSeries, unglueNumber } from './chapterText'

export type Ch = SeriesDetail['chapters'][number]

export const NUM = '(\\d+(?:\\.\\d+)?)'

/** Chapter number from the visible title (used to merge the same chapter listed by several providers). */
export function numFromTitle(t: string, url = ''): string | null {
  const m =
    t.match(new RegExp(`\\bC\\.\\s*${NUM}`, 'i')) ||
    t.match(new RegExp(`\\b(?:chapter|chap|ch|ep|episode)\\.?\\s*${NUM}`, 'i'))
  if (!m) return null
  // "Chapter 5916 months ago" on a …/chapter-59/ link is chapter 59 with its age glued on
  const u = url.match(new RegExp(`(?:chapter|chap|ch|ep|episode)[-_/ ]?${NUM}/?$`, 'i'))
  return unglueNumber(m[1], t.slice((m.index ?? 0) + m[0].length), u ? u[1] : null)
}

/** Chapter number from the title, falling back to the URL. */
export function chapterNum(c: Ch): number | null {
  const t = numFromTitle(c.title, c.url)
  if (t !== null) return Number(t)
  const m =
    c.url.match(new RegExp(`(?:chapter|chap|ch|ep|episode)[-_/ ]?${NUM}`, 'i')) ||
    c.url.match(new RegExp(`_${NUM}/?$`))
  return m ? Number(m[1]) : null
}

/**
 * Some sites list the same chapter once per provider (e.g. three "Chapter 12" links from different
 * scan hosts). Merge them into one chapter and keep the other links as fallbacks.
 */
export function mergeProviders(list: { title: string; url: string }[]): Ch[] {
  const out: Ch[] = []
  const byNum = new Map<string, Ch>()
  for (const c of list) {
    const num = numFromTitle(c.title, c.url)
    // One consistent name: "Chapter 34", whatever the site prints ("Ch. 34 108p Today", "34", "Ch.170 Thunderscans 4h ago").
    const shown = num ?? (chapterNum(c) !== null ? String(chapterNum(c)) : null)
    const title = shown !== null ? `Chapter ${shown}` : c.title || 'Chapter'
    // (a number from the address counts too: Asura Toons also lists …/manga/<series>/chapter/53, named just "53")
    const key = num ?? shown
    if (key) {
      const have = byNum.get(key)
      if (have) {
        have.alts = [...(have.alts ?? []), c.url]
        continue
      }
      const entry: Ch = { title, url: c.url, alts: [] }
      byNum.set(key, entry)
      out.push(entry)
    } else {
      out.push({ title, url: c.url })
    }
  }
  return out.map((c) => (c.alts && c.alts.length === 0 ? { title: c.title, url: c.url } : c))
}

/** Newest chapter first, whatever order the site printed them in. Chapters without a number go last. */
export function sortChapters(list: Ch[]): Ch[] {
  const withNum = list.map((c, i) => ({ c, i, n: chapterNum(c) }))
  if (withNum.filter((x) => x.n !== null).length < list.length * 0.6) return list
  withNum.sort((a, b) => {
    if (a.n === null && b.n === null) return a.i - b.i
    if (a.n === null) return 1
    if (b.n === null) return -1
    return b.n - a.n || a.i - b.i
  })
  return withNum.map((x) => x.c)
}

/** Drop other series' chapters, merge providers, sort. */
export function finalizeChapters(
  list: { title: string; url: string }[],
  slug: string,
  seriesUrl: string
): Ch[] {
  const flat = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '')
  const own = slug ? list.filter((c) => flat(c.url).includes(slug)) : []
  // nothing names this series: keep the links, except other series' chapters from a sidebar
  return sortChapters(mergeProviders(own.length > 0 ? own : dropOtherSeries(list, seriesUrl)))
}

/**
 * A list with 2 chapters whose newest is "Chapter 66" is missing most of them (series are normally numbered
 * 1, 2, 3 ...). This catches lists that were read before the page had finished loading, or only the first slice.
 */
export function looksIncomplete(chapters: { title: string; url: string }[]): boolean {
  const nums = chapters.map((c) => chapterNum(c)).filter((n): n is number => n !== null && n < 5000)
  if (nums.length === 0) return false
  const max = Math.max(...nums)
  if (max >= 10 && chapters.length < max * 0.6) return true
  // Holes in the numbering (21..60 and then 0): the middle slice was never read. A few missing numbers are normal
  // (skipped or merged chapters); a big share of the range missing is not.
  const min = Math.min(...nums)
  if (max - min >= 10) {
    const have = new Set(nums.filter((n) => Number.isInteger(n)))
    let missing = 0
    for (let n = Math.ceil(min); n <= max; n++) if (!have.has(n)) missing++
    if (missing > Math.max(3, (max - min + 1) * 0.2)) return true
  }
  return false
}

/** A readable name from a series address ("solo-leveling-5f3…" → "solo leveling"). */
export function titleFromUrl(url: string): string {
  const last = decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).pop() ?? url)
  return last
    .replace(/-[0-9a-f]{24}$/, '')
    .replace(/[-_]+/g, ' ')
    .trim()
}
