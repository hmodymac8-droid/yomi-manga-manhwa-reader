/*
 * window.api for the web version: the same functions the app's screens use, answered in the browser.
 *   - the catalog search and site list come from Supabase (read-only, see supabase/migrations)
 *   - series pages and chapters are fetched through the Worker (web/worker) and read here with the app's own code
 *     (src/core), so they are understood exactly as in the app
 *   - progress, follows and settings stay in this browser (store.ts)
 * What only the Windows app can do (downloads, the mini window, Discord, updates, adding sites) answers "nothing" and
 * its buttons are hidden on the web (see isWeb).
 */
import type {
  AppUpdateState,
  MangaApi,
  SearchResult,
  SeriesDetail,
  SourceInfo
} from '../preload/index.d'
import { staticSeries, type GetPage } from '../core/series'
import { plainChapter } from '../core/chapter'
import { titleFromUrl } from '../core/chapters'
import { normalizeTitle } from '../core/repair'
import { SUPABASE_ANON_KEY, SUPABASE_URL, WORKER_URL } from './config'
import * as store from './store'

const noop = (): void => undefined
const off = (): (() => void) => noop

// ---- Supabase (read-only) ----
async function rest<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  if (!res.ok) throw new Error(`The catalog didn't answer (${res.status})`)
  return (await res.json()) as T
}

interface SiteRow {
  id: string
  name: string
  base_url: string
  lang: 'ar' | 'en' | 'other'
  chapter_re: string
  image_proxy: boolean
  title_count: number
}
let sitesP: Promise<SiteRow[]> | null = null
function sites(): Promise<SiteRow[]> {
  sitesP ??= rest<SiteRow[]>(
    'sites?select=id,name,base_url,lang,chapter_re,image_proxy,title_count&order=sort_order'
  ).catch((e) => {
    sitesP = null
    throw e
  })
  return sitesP
}
/** Sites whose pictures must pass through the Worker (filled once the site list is in). */
const proxyHosts = new Set<string>()
void sites()
  .then((l) =>
    l.filter((s) => s.image_proxy).forEach((s) => proxyHosts.add(new URL(s.base_url).hostname))
  )
  .catch(noop)

/**
 * The address a picture is loaded from on the web: straight from the site (the page sends no referrer, which most
 * sites accept), or through the Worker for the few sites that refuse that.
 */
export function webImage(img: string, referer: string): string {
  if (!/^https:\/\//.test(img)) return img
  let host = ''
  try {
    host = new URL(referer).hostname
  } catch {
    /* no site: load it straight */
  }
  return proxyHosts.has(host)
    ? `${WORKER_URL}/img?u=${encodeURIComponent(img)}&r=${encodeURIComponent(new URL(referer).origin + '/')}`
    : img
}

// ---- the Worker: a site's page, read here ----
const get: GetPage = async (url, method = 'GET') => {
  const res = await fetch(
    `${WORKER_URL}/page?u=${encodeURIComponent(url)}${method === 'POST' ? '&m=post' : ''}`
  )
  const body = (await res.json().catch(() => ({}))) as {
    status?: number
    html?: string
    finalUrl?: string
    error?: string
  }
  if (!res.ok || typeof body.html !== 'string') throw new Error(body.error ?? `HTTP ${res.status}`)
  return { status: body.status ?? 200, html: body.html, finalUrl: body.finalUrl ?? url }
}

async function readSeries(sourceId: string, url: string): Promise<SeriesDetail> {
  const site = (await sites()).find((s) => s.id === sourceId)
  if (!site) throw new Error('This site is not on the web version yet')
  const slug = titleFromUrl(url)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
  const d = await staticSeries(get, { chapterRe: site.chapter_re }, url, slug)
  if (!d) throw new Error("This series can't be read on the web yet. It opens in the Windows app.")
  store.seriesSave(d)
  return d
}

const chapterCache = new Map<string, Promise<string[]>>()
async function readChapter(url: string): Promise<{ title: string; pages: string[] }> {
  const { chapter, fault } = await plainChapter(get, url)
  if (fault) throw new Error(fault.detail)
  if (!chapter) throw new Error('This chapter has no pages')
  if (chapter.locked) throw new Error(chapter.locked)
  if (chapter.pages.length === 0) throw new Error('No pages were found in this chapter')
  return { title: chapter.title, pages: chapter.pages }
}

const emptySearch: SearchResult = {
  total: 0,
  hits: [],
  counts: { manga: 0, manhwa: 0, manhua: 0 },
  genres: []
}
const idleUpdate: AppUpdateState = { state: 'none', current: 'web' }

export const webApi = {
  isWeb: true,
  isMini: false,

  // ---- catalog ----
  listSources: async () =>
    (await sites()).map((s): SourceInfo => ({
      id: s.id,
      name: s.name,
      baseUrl: s.base_url,
      listTemplate: '',
      seriesRe: '',
      chapterRe: s.chapter_re,
      maxPages: 0,
      lang: s.lang,
      count: s.title_count,
      crawling: false,
      hidden: false
    })),
  search: async (q, sourceIds, sort, offset, limit, kind, genre) => {
    try {
      return await rest<SearchResult>('rpc/search_titles', {
        q: normalizeTitle(q).slice(0, 100),
        only_sites: sourceIds.slice(0, 40),
        sort: sort === 'genre' ? 'mix' : sort,
        off: offset,
        lim: limit,
        want_kind: kind ?? null,
        want_genre: genre ?? null
      })
    } catch {
      return emptySearch
    }
  },
  enrich: async () => [],

  // ---- series and chapters ----
  getSeries: async (sourceId, url) => {
    try {
      return { ok: true, data: await readSeries(sourceId, url) }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  },
  getSeriesCached: async (url) => store.seriesCached(url),
  prefetchSeries: async () => undefined,
  onSeriesPartial: off,
  grabChapter: async (url) => {
    try {
      const c = await readChapter(url)
      return { ok: true, data: { url, title: c.title, pages: c.pages } }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  },
  prefetchChapter: (url) => {
    let p = chapterCache.get(url)
    if (!p) {
      p = readChapter(url)
        .then((c) => c.pages.slice(0, 3))
        .catch(() => [])
      chapterCache.set(url, p)
      if (chapterCache.size > 20) chapterCache.delete(chapterCache.keys().next().value!)
    }
    return p
  },
  seriesStart: async (_title, entries) => ({ entries, start: entries[0]?.url ?? '', speeds: {} }),
  seriesStory: async (_t, _u, _s, description) => ({ text: description }),
  // (the app adds chapters other sites have that this one lacks; the web version shows the site's own list)
  fillGaps: async () => [],
  pinSite: async () => undefined,
  unpinSite: async () => undefined,
  pinnedSite: async () => null,
  fallbackSites: async () => [],
  sourceState: async (id) => {
    const s = (await sites()).find((x) => x.id === id)
    return { availability: 'ok', name: s?.name ?? id, baseUrl: s?.base_url ?? '' }
  },
  sourceFailed: async () => ({ kind: 'none', availability: 'ok', outOfRotation: false }),
  pageBytes: async () => null,
  coverBytes: async () => null,

  // ---- your reading, kept in this browser ----
  progressGet: async (url) => store.progressGet(url),
  progressSave: async (p) => store.progressSave(p),
  progressRecent: async (limit) => store.progressRecent(limit),
  progressHide: async (url) => store.progressHide(url),
  followList: async () => store.followList(),
  followGet: async (url) => store.followGet(url),
  followSet: async (meta, following) => store.followSet(meta, following),
  followDismiss: async () => undefined,
  followCategory: async (url, c) => store.followCategory(url, c),
  followAutoDownload: async () => undefined,
  updatesCheck: async () => undefined,
  updatesStatus: async () => ({
    checking: false,
    lastChecked: 0,
    autoDownload: false,
    following: store.followList().length
  }),
  updatesSetAutoDownload: async () => undefined,
  onUpdates: off,
  getSettings: async () => store.getSettings(),
  setSettings: async (patch) => store.setSettings(patch),
  statsTime: async () => undefined,
  statsGet: async () => ({
    totalChapters: 0,
    totalMs: 0,
    weekChapters: 0,
    weekMs: 0,
    streak: 0,
    longestStreak: 0,
    daily: [],
    topGenres: [],
    topSeries: []
  }),
  recsSimilar: async () => [],
  recsBecause: async () => [],
  malInfo: async () => null,
  malTop: async () => [],

  // ---- only in the Windows app ----
  shareCreate: async () => {
    throw new Error('Sharing works in the Windows app')
  },
  downloadEnqueue: async () => undefined,
  downloadList: async () => [],
  downloadGet: async () => null,
  downloadCancel: async () => undefined,
  downloadRemove: async () => undefined,
  downloadRemoveMany: async () => undefined,
  downloadGetPaused: async () => false,
  downloadSetPaused: async () => false,
  downloadExportCbz: async () => null,
  downloadGetConcurrency: async () => 1,
  downloadSetConcurrency: async () => 1,
  onDownload: off,
  offlineGet: async () => false,
  offlineSet: async () => false,
  titleAdd: async () => ({ ok: false, error: 'Adding titles works in the Windows app' }),
  titleList: async () => [],
  titleRemove: async () => undefined,
  titleImport: async () => undefined,
  windowControl: noop,
  genreStatus: async () => ({ sites: {}, progress: {} }),
  genreScanNow: async () => false,
  genreJobs: async () => [],
  updateStatus: async () => null,
  updateInstall: async () => undefined,
  onUpdateReady: off,
  appUpdateState: async () => idleUpdate,
  appUpdateCheck: async () => idleUpdate,
  onAppUpdateState: off,
  mihonImport: async () => null,
  onMihonProgress: off,
  watchStatus: async () => ({ on: false, progress: null, sites: {} }),
  watchRun: async () => undefined,
  onWatch: off,
  catalogTrouble: async () => false,
  screenCrash: async () => null,
  restartApp: async () => false,
  catalogDiagnose: async () => '',
  clientLog: noop,
  siteHealth: async () => [],
  siteCheck: async (id) => ({ sourceId: id, ok: 0, incomplete: 0, failed: 0, lastAt: 0 }),
  addSite: async () => ({ ok: false, error: 'Adding sites works in the Windows app for now' }),
  removeSite: async () => undefined,
  setPresence: noop,
  crawl: async () => undefined,
  cancelCrawl: async () => undefined,
  onProgress: off,
  onDetect: off,
  anilistStatus: async () => ({ connected: false, clientId: '', hasClientId: false }),
  anilistSetClientId: async () => ({ connected: false, clientId: '', hasClientId: false }),
  anilistConnect: async () => ({ connected: false, clientId: '', hasClientId: false }),
  anilistDisconnect: async () => ({ connected: false, clientId: '', hasClientId: false }),
  anilistSearch: async () => ({ hits: [], suggested: null }),
  anilistLink: async () => {
    throw new Error('AniList works in the Windows app')
  },
  anilistUnlink: async () => undefined,
  anilistLinkFor: async () => null,
  anilistImport: async () => {
    throw new Error('AniList works in the Windows app')
  },
  miniOpen: async () => undefined,
  miniUpdate: async () => undefined,
  miniClose: async () => undefined,
  miniGet: async () => null,
  miniIs: async () => false,
  miniFocus: async () => undefined,
  miniReturn: async () => undefined,
  miniSetPinned: async () => false,
  miniPinned: async () => false,
  onMiniSession: off,
  onMiniOpened: off,
  onMiniClosed: off,
  onMiniReturn: off
} satisfies MangaApi & { isWeb: true }
