import assert from 'node:assert/strict'
import test from 'node:test'
import worker, { allowedPage, allowedPicture, isChapterPiece } from '../web/worker/src/index.ts'

const ENV = { ALLOWED_ORIGINS: 'https://yomi-web.pages.dev, http://localhost:5174' }
const SITE = 'https://ww3.mangafreak.me/Manga/Eleceed'

/** A pretend internet: the Worker's outgoing requests are answered by `answer` and remembered. */
function fakeNet(answer: (url: string, init: RequestInit) => Response): {
  calls: { url: string; init: RequestInit }[]
} {
  const calls: { url: string; init: RequestInit }[] = []
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init })
    return answer(url, init)
  }) as typeof fetch
  return { calls }
}
const ask = (
  path: string,
  origin: string | null = 'https://yomi-web.pages.dev',
  method = 'GET'
): Promise<Response> =>
  worker.fetch(
    new Request('https://w.example' + path, { method, headers: origin ? { Origin: origin } : {} }),
    ENV
  )
const page = (u: string, extra = ''): string => '/page?u=' + encodeURIComponent(u) + extra

test('only the supported sites, over https, with no tricks in the address', () => {
  assert.ok(allowedPage('https://ww3.mangafreak.me/Manga/Eleceed'))
  assert.equal(allowedPage('http://ww3.mangafreak.me/'), null, 'plain http')
  assert.equal(allowedPage('https://evil.example/'), null, 'another site')
  assert.equal(allowedPage('https://ww3.mangafreak.me.evil.example/'), null, 'a look-alike host')
  assert.equal(
    allowedPage('https://user:pw@ww3.mangafreak.me/'),
    null,
    'a user name in the address'
  )
  assert.equal(allowedPage('https://ww3.mangafreak.me:8443/'), null, 'another port')
  assert.equal(allowedPage('https://127.0.0.1/'), null, 'this machine')
  assert.equal(allowedPage('https://169.254.169.254/latest/meta-data'), null, 'cloud metadata')
  assert.equal(allowedPage('https://localhost/'), null)
  assert.equal(allowedPage('file:///etc/passwd'), null)
  assert.equal(allowedPage('https://constructor/'), null, 'object property names are not sites')
  assert.equal(allowedPage(null), null)
  assert.equal(allowedPage('https://ww3.mangafreak.me/' + 'a'.repeat(3000)), null, 'too long')
})

test('pictures pass only from a site that needs it, from its own picture host', () => {
  assert.ok(
    allowedPicture(
      'https://cdn.readdetectiveconan.com/file/mangap/1/1.jpg',
      'https://mangapill.com/'
    )
  )
  assert.equal(allowedPicture('https://evil.example/x.jpg', 'https://mangapill.com/'), null)
  assert.equal(
    allowedPicture('https://cdn.readdetectiveconan.com/x.jpg', 'https://ww3.mangafreak.me/'),
    null,
    'site needs no help'
  )
  assert.equal(
    allowedPicture('https://cdn.readdetectiveconan.com/x.jpg', 'https://evil.example/'),
    null
  )
  assert.equal(
    allowedPicture('http://cdn.readdetectiveconan.com/x.jpg', 'https://mangapill.com/'),
    null
  )
})

test('the only POST is a Madara chapter-list piece', () => {
  assert.ok(isChapterPiece(new URL('https://mangadar.com/manga/x/ajax/chapters/')))
  assert.ok(isChapterPiece(new URL('https://mangadar.com/manga/x/ajax/chapters/?t=3')))
  assert.equal(isChapterPiece(new URL('https://mangadar.com/wp-login.php')), false)
  assert.equal(
    isChapterPiece(new URL('https://mangadar.com/manga/x/ajax/chapters/?t=3&x=1')),
    false
  )
})

test('a page comes back as data, for Yomi only, with nothing of the visitor passed on', async () => {
  const net = fakeNet(
    () =>
      new Response('<html><title>Eleceed</title></html>', {
        status: 200,
        headers: { 'Set-Cookie': 'a=b' }
      })
  )
  const r = await ask(page(SITE))
  assert.equal(r.status, 200)
  const body = (await r.json()) as { status: number; html: string; finalUrl: string }
  assert.equal(body.status, 200)
  assert.match(body.html, /Eleceed/)
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), 'https://yomi-web.pages.dev')
  assert.equal(r.headers.get('X-Content-Type-Options'), 'nosniff')
  assert.match(r.headers.get('Content-Security-Policy') ?? '', /sandbox/)
  assert.match(r.headers.get('Content-Type') ?? '', /application\/json/)
  assert.equal(r.headers.get('Set-Cookie'), null, "the site's cookies are dropped")
  const sent = new Headers(net.calls[0].init.headers as HeadersInit)
  assert.equal(sent.get('Cookie'), null)
  assert.equal(net.calls[0].init.redirect, 'manual')
})

test('other websites, other methods and other paths get nothing', async () => {
  fakeNet(() => new Response('secret', { status: 200 }))
  assert.equal((await ask(page(SITE), 'https://evil.example')).status, 403)
  assert.equal((await ask(page(SITE), null)).status, 403, 'no Origin: not a browser on Yomi')
  assert.equal((await ask(page('https://evil.example/'))).status, 403)
  assert.equal((await ask(page(SITE), 'https://yomi-web.pages.dev', 'POST')).status, 405)
  assert.equal((await ask('/admin')).status, 404)
  assert.equal((await ask(page('https://mangadar.com/wp-login.php', '&m=post'))).status, 403)
})

test('a redirect to anywhere else is refused, one within the sites is followed', async () => {
  let n = 0
  fakeNet((url) => {
    n++
    if (url.includes('/away'))
      return new Response(null, { status: 302, headers: { Location: 'https://169.254.169.254/' } })
    if (url.includes('/hop'))
      return new Response(null, { status: 301, headers: { Location: '/Manga/Eleceed' } })
    return new Response('<html>ok</html>', { status: 200 })
  })
  const bad = await ask(page('https://ww3.mangafreak.me/away'))
  assert.equal(bad.status, 502)
  assert.equal(n, 1, 'the private address was never asked')
  const good = await ask(page('https://ww3.mangafreak.me/hop'))
  assert.equal(good.status, 200)
  assert.equal(
    ((await good.json()) as { finalUrl: string }).finalUrl,
    'https://ww3.mangafreak.me/Manga/Eleceed'
  )
})

test('a redirect loop stops', async () => {
  fakeNet(() => new Response(null, { status: 302, headers: { Location: SITE } }))
  assert.equal((await ask(page(SITE))).status, 502)
})

test('a huge page is refused', async () => {
  fakeNet(() => new Response('x'.repeat(5 * 1024 * 1024), { status: 200 }))
  assert.equal((await ask(page(SITE))).status, 502)
})

test('a passed-on picture must really be a picture', async () => {
  fakeNet(
    () =>
      new Response('<script>alert(1)</script>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      })
  )
  const pic =
    '/img?u=' +
    encodeURIComponent('https://cdn.readdetectiveconan.com/file/1.jpg') +
    '&r=' +
    encodeURIComponent('https://mangapill.com/')
  assert.equal((await ask(pic, null)).status, 502)
  const net = fakeNet(
    () =>
      new Response(new Uint8Array(100), { status: 200, headers: { 'Content-Type': 'image/jpeg' } })
  )
  const ok = await ask(pic, null)
  assert.equal(ok.status, 200)
  assert.equal(ok.headers.get('Content-Type'), 'image/jpeg')
  assert.equal(
    new Headers(net.calls[0].init.headers as HeadersInit).get('Referer'),
    'https://mangapill.com/'
  )
})

test('someone asking too often is slowed down', async () => {
  fakeNet(() => new Response('<html>ok</html>', { status: 200 }))
  let n = 0
  const env = { ...ENV, LIMITER: { limit: async () => ({ success: ++n <= 2 }) } }
  const go = (): Promise<Response> =>
    worker.fetch(
      new Request('https://w.example' + page(SITE) + '&n=' + n, {
        headers: { Origin: 'https://yomi-web.pages.dev' }
      }),
      env
    )
  assert.equal((await go()).status, 200)
  assert.equal((await go()).status, 200)
  const third = await go()
  assert.equal(third.status, 429)
  assert.equal(third.headers.get('Retry-After'), '60')
})
