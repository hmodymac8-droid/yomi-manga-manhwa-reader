import { app } from 'electron'
import { join } from 'path'
import type { HealthCheck, SiteWatchSite, SiteWatchStatus } from '../preload/index.d'
import { readJson, writeAtomic } from './safefile'
import { getSettings } from './settings'
import { dayKey, diagnose, newlyBroken, pushDay, runDue, type DayResult } from './siteWatchLogic'

/*
 * The daily site check: once a day every site is tried the way you use it (title list, a chapter list, a chapter's
 * pages and one picture, the same as "Re-check"), one site at a time, in the background. It waits while you read,
 * so it never takes the connection or the app's attention from the chapter on your screen. A failure is put into
 * plain words, and when Yomi can fix it by itself (reading an empty title list again) it does, then checks again.
 * Kept in site-watch.json: the last run and 14 days of results per site.
 */

interface Saved {
  startedAt?: number
  finishedAt?: number
  sites: Record<
    string,
    {
      days: DayResult[]
      text?: string
      cause?: SiteWatchSite['cause']
      fixed?: string
      brokeAt?: number
    }
  >
}

export interface WatchDeps {
  /** The sites to check (hidden and blocked ones left out). */
  sites: () => { id: string; name: string }[]
  /** Runs the full check on a site and gives back its result. */
  check: (id: string) => Promise<HealthCheck | undefined>
  /** Reads a site's title list again (resolves when done). */
  rescan: (id: string) => Promise<void>
  /** True while you read a chapter: the check waits. */
  reading: () => boolean
  /** Tells the windows something changed. */
  changed: () => void
  /** A site you use just broke. */
  broke?: (names: string[]) => void
}

const file = (): string => join(app.getPath('userData'), 'site-watch.json')
let saved: Saved | null = null
let deps: WatchDeps | null = null
let running: Promise<void> | null = null
let progress: SiteWatchStatus['progress'] = null

function load(): Saved {
  saved ??= readJson<Saved>(file(), 2) ?? { sites: {} }
  saved.sites ??= {}
  return saved
}
function save(): void {
  try {
    writeAtomic(file(), JSON.stringify(load()))
  } catch {
    /* tried again after the next site */
  }
}

export const watchOn = (): boolean => getSettings().siteWatch !== false

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

async function waitWhileReading(): Promise<void> {
  while (deps?.reading()) await sleep(10000)
}

async function checkOne(id: string, name: string): Promise<'ok' | 'warn' | 'fail'> {
  const d = deps!
  await waitWhileReading()
  let res = await d.check(id).catch(() => undefined)
  let overall = res?.overall ?? 'fail'
  let diag = diagnose(
    overall,
    res?.steps ?? [{ name: 'Check', status: 'fail', detail: 'the check could not run', ms: 0 }]
  )
  let fixed: string | undefined
  if (diag.fix === 'rescan') {
    progress = { ...progress!, current: name, doing: 'reading its title list again' }
    d.changed()
    await d.rescan(id).catch(() => undefined)
    await waitWhileReading()
    res = await d.check(id).catch(() => undefined)
    overall = res?.overall ?? 'fail'
    const after = diagnose(overall, res?.steps ?? [])
    if (overall !== 'fail') fixed = 'Yomi read its title list again, and it works now.'
    diag = after
  }
  const rec = (load().sites[id] ??= { days: [] })
  rec.days = pushDay(rec.days, dayKey(Date.now()), overall)
  rec.cause = diag.cause
  rec.text = diag.text
  rec.fixed = fixed
  if (overall === 'fail') rec.brokeAt ??= Date.now()
  else delete rec.brokeAt
  save()
  return overall
}

/** Runs the check on every site now (joins a run that is already going). */
export function runWatch(): Promise<void> {
  if (running) return running
  if (!deps) return Promise.resolve()
  const d = deps
  running = (async () => {
    const sites = d.sites()
    const s = load()
    s.startedAt = Date.now()
    save()
    const broke: string[] = []
    progress = { done: 0, total: sites.length, current: '', doing: '' }
    for (const site of sites) {
      progress = { ...progress, current: site.name, doing: 'checking' }
      d.changed()
      try {
        await checkOne(site.id, site.name)
        if (newlyBroken(load().sites[site.id]?.days ?? [])) broke.push(site.name)
      } catch {
        /* the next site */
      }
      progress = { ...progress, done: progress.done + 1 }
      d.changed()
      await sleep(4000) // politely spaced: each check opens real pages
    }
    // sites that are gone from the list are forgotten
    const ids = new Set(sites.map((x) => x.id))
    for (const id of Object.keys(s.sites)) if (!ids.has(id)) delete s.sites[id]
    s.finishedAt = Date.now()
    save()
    if (broke.length > 0) d.broke?.(broke)
  })().finally(() => {
    running = null
    progress = null
    deps?.changed()
  })
  return running
}

export function watchStatus(): SiteWatchStatus {
  const s = load()
  return {
    on: watchOn(),
    startedAt: s.startedAt,
    finishedAt: s.finishedAt,
    progress,
    sites: Object.fromEntries(
      Object.entries(s.sites).map(([id, r]) => [
        id,
        {
          days: r.days,
          cause: r.cause ?? 'other',
          text: r.text ?? '',
          fixed: r.fixed,
          brokeAt: r.brokeAt
        }
      ])
    )
  }
}

/** Starts the daily schedule: looks every hour whether a run is due (first look a few minutes after start). */
export function startSiteWatch(d: WatchDeps): void {
  deps = d
  const tick = (): void => {
    if (!watchOn() || running) return
    if (runDue(load(), Date.now())) void runWatch()
  }
  setTimeout(tick, 4 * 60 * 1000)
  setInterval(tick, 60 * 60 * 1000)
}
