/*
 * Reading a chapter's pages with a plain request (no browser window). Shared by the Windows app and the web version;
 * each gives its own way to fetch a page (`get`, see series.ts).
 */
import type { GetPage } from './series'
import { classifyFailure, interpretChapter, pageAddress, type FailureKind } from './repair'
import { parseChapterImages } from './staticParse'

export interface PlainChapter {
  title: string
  /** The page pictures, in reading order. */
  pages: string[]
  /** The address the page says it is (a chapter that sent you home lands somewhere else). */
  landed: string
  /** Set when the site sells or locks this chapter: what it says about it. */
  locked?: string
  /** The site named its pages itself (no guessing was needed). */
  exact?: boolean
  /** The page as it came, for the extra steps only the app can do (encrypted pictures, page lists on request). */
  html: string
}

/**
 * The chapter's pages, or why not: `fault` when the site is down, refused or moved (worth remembering), neither when
 * the page simply had no pages a plain request can see.
 */
export async function plainChapter(
  get: GetPage,
  url: string
): Promise<{ chapter?: PlainChapter; fault?: { kind: FailureKind; detail: string } }> {
  try {
    const r = await get(url)
    const verdict = interpretChapter({ status: r.status, html: r.html, finalUrl: r.finalUrl }, url)
    // A dead host, a 5xx or a browser check is remembered, then the browser ways still get a turn.
    if (!verdict.up && verdict.kind !== 'none')
      return { fault: { kind: verdict.kind, detail: verdict.detail } }
    if (r.status !== 200) return {}
    const p = parseChapterImages(r.html, url)
    return {
      chapter: {
        title: p.title,
        pages: p.pages,
        landed: pageAddress(r.html, r.finalUrl, p.title),
        ...(p.locked ? { locked: p.locked } : {}),
        ...(p.exact ? { exact: true } : {}),
        html: r.html
      }
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return { fault: { kind: classifyFailure(message), detail: message } }
  }
}
