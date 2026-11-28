/*
 * The daily site check, the parts that need no Electron (so they can be tested on their own): what a failed check
 * means in plain words, what Yomi can do about it by itself, the 14-day history and when the next run is due.
 */

import type { HealthStep, SiteWatchCause } from '../preload/index.d'
import { classifyFailure } from '../core/repair'

export type { SiteWatchCause }

/** What the check found, why, and what Yomi can try by itself. */
export interface Diagnosis {
  cause: SiteWatchCause
  /** One or two plain sentences for the Sites screen (filled in). */
  text: string
  /** The same sentence with {step} / {detail} left open, so the screen can show it in your language. */
  tpl: string
  vars?: Record<string, string>
  /** A fix Yomi can try without you: read the site's title list again. */
  fix?: 'rescan'
}

const firstBad = (steps: HealthStep[], status: 'fail' | 'warn'): HealthStep | undefined =>
  steps.find((s) => s.status === status)

/** Why a site failed (or only half worked), from the steps of its check. */
export function diagnose(overall: 'ok' | 'warn' | 'fail', steps: HealthStep[]): Diagnosis {
  const d = diagnoseRaw(overall, steps)
  const vars = d.vars
  const text = vars ? d.tpl.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m) : d.tpl
  return { ...d, text }
}

function diagnoseRaw(
  overall: 'ok' | 'warn' | 'fail',
  steps: HealthStep[]
): Omit<Diagnosis, 'text'> {
  if (overall === 'ok')
    return { cause: 'ok', tpl: 'Everything works: titles, chapters, pages and pictures.' }
  const bad = firstBad(steps, 'fail') ?? firstBad(steps, 'warn')
  if (!bad) return { cause: 'ok', tpl: 'Everything works: titles, chapters, pages and pictures.' }
  if (bad.status === 'warn')
    return {
      cause: 'partial',
      tpl: 'Works, with a catch. {step}: {detail}.',
      vars: { step: bad.name, detail: bad.detail }
    }
  if (bad.name === 'Title list')
    return {
      cause: 'titles',
      tpl: 'No titles are saved for this site, so there was nothing to open.',
      fix: 'rescan'
    }
  switch (classifyFailure(bad.detail)) {
    case 'cloudflare':
      return {
        cause: 'check',
        tpl: 'The site asks for a "verify you are human" check. Open one of its series in Yomi and pass the check once.'
      }
    case 'moved':
      return {
        cause: 'moved',
        tpl: 'The site seems to have moved to a new address. Yomi looks for it and switches over by itself.'
      }
    case 'network':
    case 'timeout':
      return {
        cause: 'down',
        tpl: "The site didn't answer. It may be down for now; Yomi tries again later and uses your other sites meanwhile."
      }
    case 'http':
      return {
        cause: 'down',
        tpl: 'The site answered with an error ({detail}). It is often down for a short while; Yomi tries again later.',
        vars: { detail: bad.detail }
      }
  }
  if (bad.name === 'Image')
    return {
      cause: 'pictures',
      tpl: 'Chapters open, but the site refused to send the pictures. Yomi reads those chapters from your other sites.'
    }
  if (bad.name === 'Chapter list' || bad.name === 'Chapter pages')
    return {
      cause: 'changed',
      tpl:
        bad.name === 'Chapter list'
          ? "The site seems to have changed how its pages are built, so Yomi can't read its chapter lists right now ({detail})."
          : "The site seems to have changed how its pages are built, so Yomi can't read its chapter pages right now ({detail}).",
      vars: { detail: bad.detail }
    }
  return { cause: 'other', tpl: '{step}: {detail}.', vars: { step: bad.name, detail: bad.detail } }
}

/** The day a check belongs to, in your own time zone ("2026-11-25"). */
export function dayKey(ts: number): string {
  const d = new Date(ts)
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export interface DayResult {
  /** dayKey */
  d: string
  o: 'ok' | 'warn' | 'fail'
}

/** Adds today's result (replacing an earlier one from the same day) and keeps the last `keep` days. */
export function pushDay(days: DayResult[], day: string, o: DayResult['o'], keep = 14): DayResult[] {
  return [...days.filter((x) => x.d !== day), { d: day, o }]
    .sort((a, b) => a.d.localeCompare(b.d))
    .slice(-keep)
}

/** A whole run is due once a day: a day after the last one finished, or right away when one was left halfway. */
export function runDue(
  last: { startedAt?: number; finishedAt?: number },
  now: number,
  every = 24 * 60 * 60 * 1000
): boolean {
  if (last.startedAt && (!last.finishedAt || last.finishedAt < last.startedAt)) return true // left halfway
  if (!last.finishedAt) return true
  return now - last.finishedAt >= every
}

/** A site that worked on its last day and doesn't now: newly broken (worth telling you about). */
export function newlyBroken(days: DayResult[]): boolean {
  if (days.length < 2) return false
  const [prev, now] = days.slice(-2)
  return now.o === 'fail' && prev.o !== 'fail'
}
