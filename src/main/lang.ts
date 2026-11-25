import { getSettings } from './settings'

/*
 * The few things the app itself says outside its window (Windows notices, file dialogs, window titles), in the
 * language chosen in Settings. The screens have their own, much bigger dictionary (src/renderer/src/locales).
 */
const AR: Record<string, string> = {
  '{chapter} is out': 'صدر {chapter}',
  '{n} new chapters are out': 'صدرت فصول جديدة: {n}',
  'New chapters': 'فصول جديدة',
  '{n} series you follow have new chapters': 'سلاسل تتابعها فيها فصول جديدة: {n}',
  '{site} stopped working': 'توقف {site} عن العمل',
  '{n} sites stopped working': 'مواقع توقفت عن العمل: {n}',
  'Yomi reads their series from your other sites meanwhile. Open Sites to see why.':
    'يقرأ Yomi سلاسلها من مواقعك الأخرى في الأثناء. افتح المواقع لتعرف السبب.',
  'Choose a Mihon or Tachiyomi backup': 'اختر نسخة احتياطية من Mihon أو Tachiyomi',
  'Choose a folder for the .cbz files': 'اختر مجلدًا لملفات ‎.cbz',
  'Yomi: site check for {host}': 'Yomi: فحص الموقع {host}',
  'Connect AniList': 'ربط AniList'
}

/** The text in the app's language, with {name} filled in. */
export function mt(en: string, vars?: Record<string, string | number>): string {
  const s = getSettings().language === 'ar' ? (AR[en] ?? en) : en
  return vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s
}
