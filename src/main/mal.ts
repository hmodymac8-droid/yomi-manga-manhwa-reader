import { app } from 'electron'
import { join } from 'path'
import type { SearchHit } from '../preload/index.d'
import { findTitle } from './catalog'
import { fetchHtml, fetchJson } from './http'
import { readJson, writeAtomic } from './safefile'
import { getSettings } from './settings'
import {
  TOP_URL,
  malNorm,
  parseMangaPage,
  parseTopPage,
  pickMatch,
  type MalInfo,
  type MalTopKind
} from './malLogic'

/*
 * MyAnimeList: a series' score and rank on its page, and MyAnimeList's top lists on Discover (only the titles that are
 * on your own sites, so every card opens). Read from MyAnimeList's public pages, no account. Yomi sends it the title
 * of the series you open; nothing else. Answers are kept (mal-cache.json): a week for a series, a day for a top list.
 * Off in Settings means nothing is asked.
 */

const WEEK = 7 * 24 * 60 * 60 * 1000
const DAY = 24 * 60 * 60 * 1000

interface Cache {
  info: Record<string, { at: number; info: MalInfo | null }>
  top: Record<string, { at: number; items: { title: string; score: string; rank: number }[] }>
}

const file = (): string => join(app.getPath('userData'), 'mal-cache.json')
let cache: Cache | null = null
let saveTimer: NodeJS.Timeout | undefined

function load(): Cache {
  cache ??= readJson<Cache>(file(), 2) ?? { info: {}, top: {} }
  cache.info ??= {}
  cache.top ??= {}
  return cache
}
function saveSoon(): void {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      writeAtomic(file(), JSON.stringify(load()))
    } catch {
      /* asked again next time */
    }
  }, 1500)
}

export const malOn = (): boolean => getSettings().myanimelist !== false

// One question to MyAnimeList at a time, a second apart: it is a busy site and asks clients to go easy.
let queue: Promise<unknown> = Promise.resolve()
function polite<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job)
  queue = run.then(
    () => new Promise((r) => setTimeout(r, 1000)),
    () => new Promise((r) => setTimeout(r, 1000))
  )
  return run
}

/** Same request already on its way: share its answer. */
const inFlight = new Map<string, Promise<MalInfo | null>>()

/** MyAnimeList's score, rank and members for a series, or null when it can't be sure which entry it is. */
export async function malInfo(title: string): Promise<MalInfo | null> {
  if (!malOn()) return null
  const key = malNorm(title)
  if (!key) return null
  const c = load().info[key]
  // a title MyAnimeList didn't know is asked again after a day, a found one after a week
  if (c && Date.now() - c.at < (c.info ? WEEK : DAY)) return c.info
  const running = inFlight.get(key)
  if (running) return running
  const job = (async (): Promise<MalInfo | null> => {
    const q = encodeURIComponent(title.slice(0, 100))
    const found = await polite(() =>
      fetchJson<unknown>(
        `https://myanimelist.net/search/prefix.json?type=manga&keyword=${q}&v=1`,
        15000
      )
    )
    if (found.status !== 200) throw new Error('MyAnimeList answered ' + found.status)
    const hit = pickMatch(found.data, [title])
    let info: MalInfo | null = null
    if (hit) {
      info = { id: hit.id, url: hit.url, score: hit.score }
      try {
        const page = await polite(() => fetchHtml(`https://myanimelist.net/manga/${hit.id}`, 15000))
        if (page.status === 200) {
          const more = parseMangaPage(page.html)
          info = { ...info, ...more, score: more.score || hit.score }
        }
      } catch {
        /* the score from the search is enough */
      }
    }
    load().info[key] = { at: Date.now(), info }
    saveSoon()
    return info
  })()
  inFlight.set(key, job)
  try {
    return await job
  } finally {
    inFlight.delete(key)
  }
}

/** A MyAnimeList top list, kept to the titles on your sites (best first), with their score and rank. */
export async function malTop(
  kind: MalTopKind
): Promise<{ hit: SearchHit; score: string; rank: number }[]> {
  if (!malOn() || !TOP_URL[kind]) return []
  let row = load().top[kind]
  if (!row || Date.now() - row.at > DAY) {
    const page = await polite(() => fetchHtml(TOP_URL[kind], 20000))
    if (page.status !== 200) throw new Error('MyAnimeList answered ' + page.status)
    const items = parseTopPage(page.html).map((i) => ({
      title: i.title,
      score: i.score,
      rank: i.rank
    }))
    if (items.length === 0) throw new Error('MyAnimeList top list was empty')
    row = { at: Date.now(), items }
    load().top[kind] = row
    saveSoon()
  }
  const out: { hit: SearchHit; score: string; rank: number }[] = []
  const seen = new Set<string>()
  for (const i of row.items) {
    const hit = await findTitle(i.title)
    if (!hit || seen.has(hit.key)) continue
    seen.add(hit.key)
    out.push({ hit, score: i.score, rank: i.rank })
  }
  return out
}
