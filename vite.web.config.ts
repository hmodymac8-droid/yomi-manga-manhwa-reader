/*
 * The web version: the app's screens built as a website (dist-web/, for Cloudflare Pages).
 *
 *   npm run dev:web     local website on http://localhost:5174 . It answers the two helpers itself, with the real code:
 *                       /api/*      the Worker (web/worker/src/index.ts)
 *                       /rest/v1/*  the catalog, in a local Postgres loaded from your app data copy (YOMI_DATA=<folder>)
 *   npm run build:web   the website, with the real addresses (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_WORKER_URL)
 *
 * The built site carries strict security headers (_headers, for Cloudflare Pages): only its own scripts run, it can't be
 * framed, and it only talks to the catalog and the Worker.
 */
import { resolve } from 'path'
import { readFileSync, writeFileSync } from 'fs'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const DEV_PORT = 5174

/** The Worker and the catalog, answered by the dev server itself. */
function devHelpers(): Plugin {
  return {
    name: 'yomi-dev-helpers',
    apply: 'serve',
    async configureServer(server) {
      const worker = (await server.ssrLoadModule(resolve(__dirname, 'web/worker/src/index.ts')))
        .default as {
        fetch(r: Request, env: { ALLOWED_ORIGINS: string }): Promise<Response>
      }
      const origin = `http://localhost:${DEV_PORT}`
      let db: Promise<{
        query: (sql: string, params?: unknown[]) => Promise<{ rows: { r: unknown }[] }>
      }> | null = null
      const catalog = (): NonNullable<typeof db> => {
        db ??= (async () => {
          const { PGlite } = await import('@electric-sql/pglite')
          const { pg_trgm } = await import('@electric-sql/pglite/contrib/pg_trgm')
          const { buildWebCatalog } = (await server.ssrLoadModule(
            resolve(__dirname, 'tools/webCatalog.ts')
          )) as unknown as {
            buildWebCatalog: (
              cat: unknown,
              meta: unknown,
              genres: unknown
            ) => { sites: object[]; groups: object[] }
          }
          const dir = process.env.YOMI_DATA ?? ''
          const read = (f: string): unknown => {
            try {
              return JSON.parse(readFileSync(resolve(dir, f), 'utf8'))
            } catch {
              return {}
            }
          }
          const c = buildWebCatalog(
            read('catalog.json'),
            read('series-meta.json'),
            read('genre-index.json')
          )
          const pg = new PGlite({ extensions: { pg_trgm } })
          await pg.exec('create role anon nologin; create role authenticated nologin;')
          await pg.exec(readFileSync('supabase/migrations/20261128000100_web_catalog.sql', 'utf8'))
          const load = async (table: string, rows: object[], cols: string): Promise<void> => {
            for (let i = 0; i < rows.length; i += 2000)
              await pg.query(
                `insert into public.${table} (${cols}) select ${cols} from json_populate_recordset(null::public.${table}, $1::json)`,
                [JSON.stringify(rows.slice(i, i + 2000))]
              )
          }
          await load(
            'sites',
            c.sites,
            'id,name,base_url,lang,chapter_re,image_proxy,sort_order,title_count'
          )
          await load(
            'title_groups',
            c.groups,
            'title_key,title,cover,cover_fallback,cover_referer,entries,site_ids,n_sites,kind,genres,mix,pos'
          )
          await pg.exec('analyze; set role anon')
          console.log(`[dev] catalog: ${c.sites.length} sites, ${c.groups.length} titles`)
          return pg as never
        })()
        return db
      }
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? ''
        try {
          if (url.startsWith('/api/')) {
            // the browser sends no Origin to its own server; the Worker wants to see Yomi's website, as in production
            const r = await worker.fetch(
              new Request('http://worker' + url.slice(4), { headers: { Origin: origin } }),
              { ALLOWED_ORIGINS: origin }
            )
            res.statusCode = r.status
            r.headers.forEach((v, k) => res.setHeader(k, v))
            res.end(Buffer.from(await r.arrayBuffer()))
            return
          }
          if (url.startsWith('/rest/v1/rpc/search_titles') && req.method === 'POST') {
            const body = await new Promise<string>((ok) => {
              let s = ''
              req.on('data', (d) => (s += d))
              req.on('end', () => ok(s))
            })
            const a = JSON.parse(body || '{}')
            const pg = await catalog()
            const r = await pg.query(
              'select public.search_titles(q => $1, only_sites => $2, sort => $3, off => $4, lim => $5, want_kind => $6, want_genre => $7) as r',
              [
                a.q ?? '',
                a.only_sites ?? [],
                a.sort ?? 'mix',
                a.off ?? 0,
                a.lim ?? 60,
                a.want_kind ?? null,
                a.want_genre ?? null
              ]
            )
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(r.rows[0].r))
            return
          }
          if (url.startsWith('/rest/v1/sites')) {
            const pg = await catalog()
            const r = await pg.query(
              `select coalesce(json_agg(x order by x.sort_order), '[]') as r from (select id, name, base_url, lang, chapter_re, image_proxy, title_count, sort_order from public.sites) x`
            )
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(r.rows[0].r))
            return
          }
        } catch (e) {
          res.statusCode = 500
          res.end(String(e))
          return
        }
        next()
      })
    }
  }
}

/** Security headers for Cloudflare Pages, with the real addresses the site talks to. */
function securityHeaders(env: Record<string, string>): Plugin {
  return {
    name: 'yomi-security-headers',
    apply: 'build',
    closeBundle() {
      const talk = [env.VITE_SUPABASE_URL, env.VITE_WORKER_URL]
        .filter(Boolean)
        .map((u) => new URL(u).origin)
        .join(' ')
      const csp = [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "font-src 'self' data:",
        // manga pictures come from the sites themselves
        "img-src 'self' https: data: blob:",
        `connect-src 'self' ${talk}`.trim(),
        "object-src 'none'",
        "base-uri 'none'",
        "form-action 'none'",
        "frame-ancestors 'none'",
        'upgrade-insecure-requests'
      ].join('; ')
      writeFileSync(
        resolve(__dirname, 'dist-web/_headers'),
        [
          '/*',
          `  Content-Security-Policy: ${csp}`,
          '  X-Content-Type-Options: nosniff',
          '  X-Frame-Options: DENY',
          '  Referrer-Policy: no-referrer',
          '  Strict-Transport-Security: max-age=31536000; includeSubDomains',
          '  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          '  Cross-Origin-Opener-Policy: same-origin',
          ''
        ].join('\n')
      )
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    root: resolve(__dirname, 'src/web'),
    publicDir: resolve(__dirname, 'src/web/public'),
    envDir: __dirname,
    resolve: {
      alias: {
        '@renderer': resolve(__dirname, 'src/renderer/src'),
        // Node's crypto doesn't exist in a browser (see src/web/cryptoShim.ts)
        crypto: resolve(__dirname, 'src/web/cryptoShim.ts')
      }
    },
    plugins: [react(), devHelpers(), securityHeaders(env)],
    server: { port: DEV_PORT, strictPort: true, fs: { allow: [__dirname] } },
    build: {
      outDir: resolve(__dirname, 'dist-web'),
      emptyOutDir: true,
      sourcemap: false,
      chunkSizeWarningLimit: 1500
    }
  }
})
