/*
 * Yomi web: the only part that talks to the manga sites. A browser can't read other sites' pages itself, so the
 * website asks this Worker for a page and reads it in the visitor's own browser (Cloudflare's free plan allows very
 * little work here, and nothing about the page is trusted).
 *
 * Safety, all of it from the first deploy:
 *   - Only the sites listed below, only https, normal ports, no addresses with a user name. Every redirect is followed
 *     by hand and checked against the same list, so the Worker can't be pointed at anything else (no open proxy,
 *     no reaching private addresses).
 *   - Nothing of the visitor is passed on: no cookies, no headers. Cookies the sites set are dropped.
 *   - Pages come back as JSON data with `nosniff` and a sandbox policy: opening a Worker address in a browser can
 *     never run a site's scripts under this address.
 *   - Only Yomi's website may read the answers (CORS), sizes and times are capped, and a rate-limit rule in front
 *     (Cloudflare dashboard) slows anyone who asks too often.
 *   - Pictures only pass through here for sites that refuse them otherwise, and only from their known picture hosts.
 */

export interface Env {
  /** Comma-separated website addresses allowed to read answers, e.g. "https://yomi-web.pages.dev". */
  ALLOWED_ORIGINS?: string
  /** Cloudflare's rate limiter (wrangler.toml): how often one visitor may ask. Missing in local tests. */
  LIMITER?: { limit(o: { key: string }): Promise<{ success: boolean }> }
}

/** The sites the web version reads (same as tools/webCatalog.ts), and where their pictures may come from. */
export const SITES: Record<string, { pictures?: string[] }> = {
  'ww3.mangafreak.me': {},
  'mangapill.com': { pictures: ['cdn.readdetectiveconan.com'] },
  'webtoonclub.com': {},
  'kuramanga.com': {},
  'projectsuki.com': {},
  'azorafly.com': {},
  'olympustaff.com': {},
  'mangadar.com': {}
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
const MAX_PAGE = 4 * 1024 * 1024
const MAX_PICTURE = 10 * 1024 * 1024
const TIME = 15_000
const MAX_HOPS = 4

/** An address this Worker may fetch, or null. */
export function allowedPage(raw: string | null): URL | null {
  if (!raw || raw.length > 2000) return null
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return null
  }
  if (u.protocol !== 'https:' || u.port || u.username || u.password) return null
  return Object.hasOwn(SITES, u.hostname) ? u : null
}

/** A picture this Worker may pass on: from a known picture host of a site whose pictures need it. */
export function allowedPicture(
  raw: string | null,
  referer: string | null
): { pic: URL; site: URL } | null {
  const site = allowedPage(referer)
  if (!site || !raw || raw.length > 2000) return null
  let pic: URL
  try {
    pic = new URL(raw)
  } catch {
    return null
  }
  if (pic.protocol !== 'https:' || pic.port || pic.username || pic.password) return null
  const hosts = SITES[site.hostname].pictures ?? []
  return hosts.includes(pic.hostname) ? { pic, site } : null
}

/** Madara sites hand out a series' chapter list in pieces: the only kind of POST this Worker makes. */
export function isChapterPiece(u: URL): boolean {
  return /\/ajax\/chapters\/?$/.test(u.pathname) && (!u.search || /^\?t=\d{1,3}$/.test(u.search))
}

function originOk(req: Request, env: Env): string | null {
  const origin = req.headers.get('Origin')
  if (!origin) return null
  const allowed = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return allowed.includes(origin) ? origin : null
}

function headers(origin: string | null, extra: Record<string, string> = {}): Headers {
  const h = new Headers({
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "sandbox; default-src 'none'",
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    Vary: 'Origin',
    ...extra
  })
  if (origin) h.set('Access-Control-Allow-Origin', origin)
  return h
}

const json = (
  body: unknown,
  status: number,
  origin: string | null,
  extra?: Record<string, string>
): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: headers(origin, { 'Content-Type': 'application/json; charset=utf-8', ...extra })
  })

/** Fetches an allowed address, following redirects by hand (each one checked), with no cookies and a time limit. */
async function fetchChecked(
  start: URL,
  init: {
    method: 'GET' | 'POST'
    accept: string
    referer?: string
    check: (u: string) => URL | null
  }
): Promise<{ res: Response; url: URL } | { error: string; status: number }> {
  let url = start
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    const res = await fetch(url.href, {
      method: init.method,
      redirect: 'manual',
      signal: AbortSignal.timeout(TIME),
      headers: {
        'User-Agent': UA,
        Accept: init.accept,
        'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
        ...(init.referer ? { Referer: init.referer } : {}),
        ...(init.method === 'POST' ? { 'X-Requested-With': 'XMLHttpRequest' } : {})
      }
    })
    if (res.status < 300 || res.status >= 400) return { res, url }
    const next = init.check(new URL(res.headers.get('Location') ?? '', url).href)
    if (!next) return { error: 'the site sent us somewhere else', status: 502 }
    url = next
    if (init.method === 'POST') init = { ...init, method: 'GET' }
  }
  return { error: 'too many redirects', status: 502 }
}

/** Reads a body up to a size limit. */
async function readCapped(res: Response, max: number): Promise<Uint8Array<ArrayBuffer> | null> {
  const len = Number(res.headers.get('Content-Length') ?? 0)
  if (len > max) return null
  const reader = res.body?.getReader()
  if (!reader) return new Uint8Array(new ArrayBuffer(0))
  const parts: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > max) {
      await reader.cancel()
      return null
    }
    parts.push(value)
  }
  const out = new Uint8Array(size)
  let at = 0
  for (const p of parts) {
    out.set(p, at)
    at += p.byteLength
  }
  return out
}

async function page(req: URL, origin: string | null): Promise<Response> {
  const target = allowedPage(req.searchParams.get('u'))
  if (!target) return json({ error: 'not a page of a supported site' }, 403, origin)
  const post = req.searchParams.get('m') === 'post'
  if (post && !isChapterPiece(target)) return json({ error: 'not allowed' }, 403, origin)
  const got = await fetchChecked(target, {
    method: post ? 'POST' : 'GET',
    accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
    referer: post ? target.origin + '/' : undefined,
    check: allowedPage
  })
  if ('error' in got) return json({ error: got.error }, got.status, origin)
  const body = await readCapped(got.res, MAX_PAGE)
  if (!body) return json({ error: 'page too big' }, 502, origin)
  const html = new TextDecoder().decode(body)
  return json({ status: got.res.status, finalUrl: got.url.href, html }, 200, origin, {
    'Cache-Control': 'public, max-age=300'
  })
}

async function picture(req: URL, origin: string | null): Promise<Response> {
  const ok = allowedPicture(req.searchParams.get('u'), req.searchParams.get('r'))
  if (!ok) return json({ error: 'not a picture this site needs passed on' }, 403, origin)
  const got = await fetchChecked(ok.pic, {
    method: 'GET',
    accept: 'image/avif,image/webp,image/*,*/*;q=0.8',
    referer: ok.site.origin + '/',
    check: (u) => allowedPicture(u, ok.site.href)?.pic ?? null
  })
  if ('error' in got) return json({ error: got.error }, got.status, origin)
  const type = (got.res.headers.get('Content-Type') ?? '').split(';')[0].trim().toLowerCase()
  if (!got.res.ok || !/^image\/(jpeg|png|webp|gif|avif)$/.test(type))
    return json({ error: 'not a picture' }, 502, origin)
  const body = await readCapped(got.res, MAX_PICTURE)
  if (!body) return json({ error: 'picture too big' }, 502, origin)
  return new Response(body, {
    status: 200,
    headers: headers(origin, { 'Content-Type': type, 'Cache-Control': 'public, max-age=86400' })
  })
}

export default {
  async fetch(
    req: Request,
    env: Env,
    ctx?: { waitUntil(p: Promise<unknown>): void }
  ): Promise<Response> {
    const url = new URL(req.url)
    const origin = originOk(req, env)
    if (req.method === 'OPTIONS')
      return new Response(null, { status: 204, headers: headers(origin) })
    if (req.method !== 'GET') return json({ error: 'method not allowed' }, 405, origin)
    if (url.pathname !== '/page' && url.pathname !== '/img')
      return json({ error: 'not found' }, 404, origin)
    // answers are only for Yomi's website: a browser on any other site gets nothing it can read
    if (!origin && url.pathname === '/page') return json({ error: 'not allowed' }, 403, null)
    // one visitor can only ask so often (a person reading never reaches it)
    if (env.LIMITER) {
      const who = req.headers.get('CF-Connecting-IP') ?? 'unknown'
      const { success } = await env.LIMITER.limit({ key: who })
      if (!success)
        return json({ error: 'too many requests, wait a minute' }, 429, origin, {
          'Retry-After': '60'
        })
    }

    // the same page asked again within a few minutes comes from Cloudflare's cache (cheaper for everyone)
    const cache =
      typeof caches !== 'undefined' ? (caches as unknown as { default: Cache }).default : null
    const key = new Request(url.href, { method: 'GET' })
    const hit = cache ? await cache.match(key) : undefined
    if (hit) {
      const h = new Headers(hit.headers)
      if (origin) h.set('Access-Control-Allow-Origin', origin)
      else h.delete('Access-Control-Allow-Origin')
      return new Response(hit.body, { status: hit.status, headers: h })
    }
    let res: Response
    try {
      res = url.pathname === '/page' ? await page(url, origin) : await picture(url, origin)
    } catch (e) {
      const msg =
        e instanceof Error && e.name === 'TimeoutError'
          ? 'the site took too long'
          : 'the site did not answer'
      return json({ error: msg }, 504, origin)
    }
    if (cache && res.status === 200) {
      const copy = res.clone()
      const h = new Headers(copy.headers)
      h.delete('Access-Control-Allow-Origin')
      const put = cache.put(key, new Response(copy.body, { status: 200, headers: h }))
      if (ctx) ctx.waitUntil(put)
      else await put
    }
    return res
  }
}
