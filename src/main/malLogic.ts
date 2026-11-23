/*
 * Reading MyAnimeList's public pages: its quick search (search/prefix.json), a series page and its top lists.
 * Kept free of Electron so it can be tested on its own.
 */

import type { MalInfo, MalTopItem, MalTopKind } from '../preload/index.d'

export type { MalInfo, MalTopItem, MalTopKind }

/** The address of each top list (50 titles a page). */
export const TOP_URL: Record<MalTopKind, string> = {
  popular: 'https://myanimelist.net/topmanga.php?type=bypopularity',
  manhwa: 'https://myanimelist.net/topmanga.php?type=manhwa',
  manga: 'https://myanimelist.net/topmanga.php?type=manga',
  manhua: 'https://myanimelist.net/topmanga.php?type=manhua'
}

/** Comics only: MyAnimeList's "manga" search also lists novels of the same name. */
const COMIC = /^(manga|manhwa|manhua|one-shot|doujinshi|oel)$/i

/** Letters and digits only, any script, lower case ("Solo Leveling!" and "solo-leveling" are the same). */
export function malNorm(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
}

interface PrefixItem {
  id: number
  name: string
  url: string
  payload?: { media_type?: string; score?: string }
}

/**
 * The MyAnimeList entry for a title from its quick search: only a comic whose name is the same title. A near name
 * is not enough ("Solo Leveling: Ragnarok" is another series), so a title it can't be sure of gets nothing.
 */
export function pickMatch(
  json: unknown,
  titles: string[]
): { id: number; url: string; score: string } | null {
  const cats =
    (json as { categories?: { type?: string; items?: PrefixItem[] }[] } | null)?.categories ?? []
  const items = cats.filter((c) => c.type === 'manga').flatMap((c) => c.items ?? [])
  const want = new Set(titles.map(malNorm).filter((t) => t.length > 0))
  for (const it of items) {
    if (!it || typeof it.id !== 'number' || typeof it.name !== 'string') continue
    if (!COMIC.test(it.payload?.media_type ?? '')) continue
    if (!want.has(malNorm(it.name))) continue
    const score = /^\d+(\.\d+)?$/.test(it.payload?.score ?? '') ? it.payload!.score! : ''
    return { id: it.id, url: it.url || `https://myanimelist.net/manga/${it.id}`, score }
  }
  return null
}

const num = (s: string | undefined): number | undefined => {
  const n = s ? parseInt(s.replace(/[^\d]/g, ''), 10) : NaN
  return Number.isFinite(n) && n > 0 ? n : undefined
}

/** Rank, popularity, members and score from a series page (whatever of them it shows). */
export function parseMangaPage(html: string): Omit<MalInfo, 'id' | 'url'> {
  const pick = (re: RegExp): string | undefined => re.exec(html)?.[1]
  const score = pick(/class="score-label score-\d+">\s*(\d+\.\d+)\s*</) ?? ''
  return {
    score,
    scoredBy: num(pick(/itemprop="ratingCount"[^>]*>\s*([\d,]+)/)),
    rank: num(pick(/class="numbers ranked"[^>]*>\s*Ranked\s*<strong>\s*#([\d,]+)/)),
    popularity: num(pick(/class="numbers popularity"[^>]*>\s*Popularity\s*<strong>\s*#([\d,]+)/)),
    members: num(pick(/class="numbers members"[^>]*>\s*Members\s*<strong>\s*([\d,]+)/))
  }
}

const decode = (s: string): string =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim()

/** The titles of a top list page, in order. */
export function parseTopPage(html: string): MalTopItem[] {
  const out: MalTopItem[] = []
  for (const row of html.split('<tr class="ranking-list">').slice(1)) {
    const rank = num(/top-anime-rank-text[^"]*">\s*(\d+)/.exec(row)?.[1])
    const t =
      /<h3 class="manga_h3">\s*<a[^>]+href="(https:\/\/myanimelist\.net\/manga\/(\d+)\/[^"]*)"[^>]*>([^<]+)<\/a>/.exec(
        row
      )
    if (!rank || !t) continue
    const score = /score-label score-[^"]*">\s*(\d+\.\d+)\s*</.exec(row)?.[1] ?? ''
    out.push({ id: Number(t[2]), url: t[1], title: decode(t[3]), score, rank })
  }
  return out
}
