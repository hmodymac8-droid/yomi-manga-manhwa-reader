/*
 * Which sites can the web version read for free? For every site in a copy of the app's catalog: read one series and
 * its newest chapter with the shared code (src/core, plain requests, no browser), then try the first picture the way
 * a web page would load it: with no Referer (what <img referrerpolicy="no-referrer"> sends).
 *
 *   node --experimental-strip-types tools/web-probe.ts <catalog.json> [out.json]
 *
 * Writes a JSON report (site, series, chapters, pages, picture with/without referer) and a page out.html that shows
 * the first picture of every site with referrerpolicy="no-referrer", to check in a real browser.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { staticSeries, type GetPage } from '../src/core/series.ts'
import { plainChapter } from '../src/core/chapter.ts'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'

const get: GetPage = async (url, method = 'GET') => {
  const ctl = AbortSignal.timeout(20000)
  const r = await fetch(url, {
    method,
    signal: ctl,
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
      ...(method === 'POST' ? { 'X-Requested-With': 'XMLHttpRequest' } : {})
    }
  })
  return { status: r.status, html: await r.text(), finalUrl: r.url || url }
}

async function picture(url: string, referer?: string): Promise<string> {
  try {
    const r = await fetch(url, {
      signal: AbortSignal.timeout(20000),
      headers: { 'User-Agent': UA, Accept: 'image/*', ...(referer ? { Referer: referer } : {}) }
    })
    const type = r.headers.get('content-type') ?? ''
    const size = (await r.arrayBuffer()).byteLength
    return r.ok && type.startsWith('image/') && size > 5000 ? `ok ${Math.round(size / 1024)}KB` : `no ${r.status} ${type.split(';')[0]} ${size}B`
  } catch (e) {
    return 'error ' + (e instanceof Error ? e.message : String(e)).slice(0, 60)
  }
}

const [file, out = 'web-probe.json'] = process.argv.slice(2)
const cat = JSON.parse(readFileSync(file, 'utf8')) as {
  sources: { id: string; name: string; baseUrl: string; chapterRe?: string; hidden?: boolean }[]
  series: Record<string, { url: string; title: string }[]>
}
const report: Record<string, unknown>[] = []
for (const src of cat.sources) {
  if (/comix/i.test(src.id)) continue
  const list = (cat.series[src.id] ?? []).slice(0, 40)
  const row: Record<string, unknown> = { site: src.name, id: src.id }
  // a few series: some are short, new or empty
  for (const s of [list[0], list[7], list[19], list[33]].filter(Boolean)) {
    try {
      const slug = new URL(s.url).pathname.split('/').filter(Boolean).pop()!.replace(/-[0-9a-f]{24}$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '')
      const d = await staticSeries(get, { chapterRe: src.chapterRe ?? '' }, s.url, slug)
      if (!d || d.chapters.length === 0) {
        row.series = 'no chapters (plain request): ' + s.url
        continue
      }
      row.series = s.url
      row.chapters = d.chapters.length
      const { chapter, fault } = await plainChapter(get, d.chapters[0].url)
      if (fault) row.chapter = 'fault ' + fault.kind + ' ' + fault.detail.slice(0, 80)
      if (!chapter || chapter.pages.length === 0) {
        row.pages = 0
        continue
      }
      row.chapterUrl = d.chapters[0].url
      row.pages = chapter.pages.length
      row.firstPage = chapter.pages[0]
      row.noReferer = await picture(chapter.pages[0])
      row.withReferer = await picture(chapter.pages[0], new URL(src.baseUrl).origin + '/')
      break
    } catch (e) {
      row.error = (e instanceof Error ? e.message : String(e)).slice(0, 100)
    }
  }
  console.log(JSON.stringify(row))
  report.push(row)
}
writeFileSync(out, JSON.stringify(report, null, 2))
const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
writeFileSync(
  out.replace(/\.json$/, '.html'),
  `<!doctype html><meta charset="utf-8"><title>web probe</title><body style="font:14px system-ui;background:#111;color:#eee">` +
    report
      .filter((r) => r.firstPage)
      .map(
        (r) =>
          `<div style="display:inline-block;width:180px;margin:6px;vertical-align:top"><b>${esc(String(r.site))}</b><br><img data-site="${esc(String(r.id))}" referrerpolicy="no-referrer" src="${esc(String(r.firstPage))}" style="width:180px;min-height:20px;background:#333"></div>`
      )
      .join('')
)
