/*
 * What the web version remembers for you, kept in this browser only (like the app keeps it on your PC): reading
 * progress, followed series, settings and recently opened chapter lists. Nothing of it is sent anywhere.
 */
import type {
  AppSettings,
  FollowCategory,
  FollowInfo,
  FollowMeta,
  ProgressPatch,
  ProgressRecord,
  SeriesDetail
} from '../preload/index.d'

const PREFIX = 'yomi.web.'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // storage full: drop the saved chapter lists (they can be read again) and try once more
    try {
      localStorage.removeItem(PREFIX + 'series')
      localStorage.setItem(PREFIX + key, JSON.stringify(value))
    } catch {
      /* not remembered this time */
    }
  }
}

// ---- reading progress ----
type Progress = Record<string, ProgressRecord>

export function progressGet(url: string): ProgressRecord | null {
  return read<Progress>('progress', {})[url] ?? null
}

export function progressSave(p: ProgressPatch): void {
  const all = read<Progress>('progress', {})
  const old = all[p.seriesUrl]
  const readSet = new Set(old?.read ?? [])
  if (p.markRead) readSet.add(p.markRead)
  const rest: ProgressPatch = { ...p }
  delete rest.markRead
  all[p.seriesUrl] = {
    ...rest,
    read: [...readSet].slice(-5000),
    updatedAt: Date.now(),
    hidden: false
  }
  // a few hundred series at most: the oldest go first
  const keys = Object.keys(all)
  if (keys.length > 500)
    for (const k of keys
      .sort((a, b) => all[a].updatedAt - all[b].updatedAt)
      .slice(0, keys.length - 500))
      delete all[k]
  write('progress', all)
}

export function progressRecent(limit: number): ProgressRecord[] {
  return Object.values(read<Progress>('progress', {}))
    .filter((r) => !r.hidden)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, Math.max(0, Math.min(limit, 1000)))
}

export function progressHide(url: string): void {
  const all = read<Progress>('progress', {})
  if (all[url]) {
    all[url].hidden = true
    write('progress', all)
  }
}

// ---- followed series ----
interface Follow extends FollowMeta {
  following: boolean
  category?: FollowCategory
  at: number
}
type Follows = Record<string, Follow>

const asInfo = (f: Follow): FollowInfo => ({
  ...f,
  newChapters: [],
  lastChecked: 0,
  unread: 0,
  unreadChapters: []
})

export function followList(): FollowInfo[] {
  return Object.values(read<Follows>('follows', {}))
    .filter((f) => f.following)
    .sort((a, b) => b.at - a.at)
    .map(asInfo)
}

export function followGet(url: string): FollowInfo | null {
  const f = read<Follows>('follows', {})[url]
  return f ? asInfo(f) : null
}

export function followSet(meta: FollowMeta, following: boolean): void {
  const all = read<Follows>('follows', {})
  if (following)
    all[meta.seriesUrl] = { ...all[meta.seriesUrl], ...meta, following: true, at: Date.now() }
  else delete all[meta.seriesUrl]
  write('follows', all)
}

export function followCategory(url: string, category: FollowCategory): void {
  const all = read<Follows>('follows', {})
  if (all[url]) {
    all[url].category = category
    write('follows', all)
  }
}

// ---- settings ----
const DEFAULTS: AppSettings = { showLibrary: true, recommendations: false, myanimelist: false }

export function getSettings(): AppSettings {
  return { ...DEFAULTS, ...read<Partial<AppSettings>>('settings', {}) }
}

export function setSettings(patch: Partial<AppSettings>): AppSettings {
  const next = { ...getSettings(), ...patch }
  write('settings', next)
  return next
}

// ---- recently opened chapter lists (so a series opens instantly the second time) ----
type SeriesCache = Record<string, { at: number; detail: SeriesDetail }>

export function seriesCached(url: string): SeriesDetail | null {
  return read<SeriesCache>('series', {})[url]?.detail ?? null
}

export function seriesSave(d: SeriesDetail): void {
  const all = read<SeriesCache>('series', {})
  all[d.url] = { at: Date.now(), detail: d }
  const keys = Object.keys(all)
  if (keys.length > 40)
    for (const k of keys.sort((a, b) => all[a].at - all[b].at).slice(0, keys.length - 40))
      delete all[k]
  write('series', all)
}
