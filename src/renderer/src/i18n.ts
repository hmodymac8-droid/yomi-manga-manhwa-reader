import { AR } from './locales/ar'

/*
 * Yomi in English or Arabic. Every piece of text on screen goes through t(), keyed by its English wording, so the
 * code still reads naturally and a sentence with no Arabic yet simply shows in English. Arabic turns the whole window
 * right to left. The language is kept in this window's storage so the first screen already shows in it; changing it
 * in Settings reloads the window.
 *
 *   t('Show all {n}', { n: 12 })      →  "Show all 12" / "عرض الكل 12"
 *   t('Chapter {n}', { n: 5 })        →  "Chapter 5" / "الفصل 5"
 */

export type Lang = 'en' | 'ar'

const KEY = 'yomi.lang'

function readLang(): Lang {
  try {
    return localStorage.getItem(KEY) === 'ar' ? 'ar' : 'en'
  } catch {
    return 'en'
  }
}

let lang: Lang = readLang()

export const currentLang = (): Lang => lang
export const isRtl = (): boolean => lang === 'ar'

/** Sets the window's language and direction (call once at start). */
export function applyLang(): void {
  document.documentElement.lang = lang
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
}

/**
 * Switches language: saved (here for the first screen, and in the app's settings for the notices the app sends),
 * then the window reloads so every screen shows it.
 */
export function setLang(next: Lang): void {
  try {
    localStorage.setItem(KEY, next)
  } catch {
    /* not remembered */
  }
  lang = next
  void window.api
    .setSettings({ language: next })
    .catch(() => undefined)
    .finally(() => window.location.reload())
}

const fill = (s: string, vars?: Record<string, string | number>): string =>
  vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s

/** The text in the window's language, with {name} filled in. */
export function t(en: string, vars?: Record<string, string | number>): string {
  if (lang === 'ar') {
    const ar = AR[en]
    if (ar !== undefined) return fill(ar, vars)
  }
  return fill(en, vars)
}

/** Numbers in the window's language (Arabic keeps Western digits, as most Arabic apps and sites do). */
export function num(n: number): string {
  return n.toLocaleString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US')
}

/** "5 min ago", "3 h ago", "2 d ago". */
export function ago(at: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - at) / 1000))
  if (s < 60) return t('just now')
  if (s < 3600) return t('{n} min ago', { n: Math.round(s / 60) })
  if (s < 86400) return t('{n} h ago', { n: Math.round(s / 3600) })
  return t('{n} d ago', { n: Math.round(s / 86400) })
}
