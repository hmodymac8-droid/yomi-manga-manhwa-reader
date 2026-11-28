/*
 * Puts the web version's catalog (the supported sites and their titles) into Supabase, from a copy of the app's data
 * folder. Run it on your own PC; it never changes the data folder.
 *
 *   npm run web:upload -- <app data folder> [--dry-run]
 *
 * Needs, in .env.local (never committed) or the environment:
 *   SUPABASE_URL                 https://<project>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY    the secret key (Project Settings → API). Only this tool uses it; the website never has it.
 *
 * Rows are written with this upload's run id; at the end, rows an earlier upload wrote and this one didn't (titles a
 * site removed) are deleted. A failed upload leaves the earlier catalog in place.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildWebCatalog, WEB_SITES } from './webCatalog.ts'

// .env.local, if there is one (KEY=value lines)
if (existsSync('.env.local'))
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/.exec(line)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }

const args = process.argv.slice(2)
const dir = args.find((a) => !a.startsWith('--'))
const dry = args.includes('--dry-run')
if (!dir) {
  console.error('Give the app data folder: npm run web:upload -- <folder> [--dry-run]')
  process.exit(1)
}
const read = (f: string): never =>
  existsSync(join(dir, f)) ? JSON.parse(readFileSync(join(dir, f), 'utf8')) : ({} as never)
const { sites, titles, groups } = buildWebCatalog(
  read('catalog.json'),
  read('series-meta.json'),
  read('genre-index.json')
)
console.log(
  `catalog: ${sites.length} sites, ${titles.length} titles, ${groups.length} grouped titles`
)
for (const s of sites)
  console.log(
    `  ${s.name.padEnd(14)} ${s.title_count} titles${s.image_proxy ? ' (pictures through the Worker)' : ''}`
  )
if (sites.length !== WEB_SITES.length)
  console.warn(
    `note: ${WEB_SITES.length - sites.length} supported sites are missing from this data folder`
  )
if (dry) process.exit(0)

const url = (process.env.SUPABASE_URL ?? '').replace(/\/$/, '')
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) || key.length < 20) {
  console.error(
    'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first (see the top of this file).'
  )
  process.exit(1)
}
const run = Date.now().toString(36)
const headers = {
  apikey: key,
  Authorization: 'Bearer ' + key,
  'Content-Type': 'application/json'
}

async function call(
  method: string,
  path: string,
  body?: unknown,
  prefer = 'return=minimal'
): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${url}/rest/v1/${path}`, {
      method,
      headers: { ...headers, Prefer: prefer },
      body: body === undefined ? undefined : JSON.stringify(body)
    })
    if (res.ok) return
    const text = (await res.text()).slice(0, 300)
    if (attempt >= 3 || res.status < 500)
      throw new Error(`${method} ${path.split('?')[0]}: ${res.status} ${text}`)
    await new Promise((r) => setTimeout(r, 2000 * attempt))
  }
}

async function upsert(table: string, rows: object[], size: number): Promise<void> {
  for (let i = 0; i < rows.length; i += size) {
    await call('POST', table, rows.slice(i, i + size), 'resolution=merge-duplicates,return=minimal')
    process.stdout.write(`\r  ${table}: ${Math.min(i + size, rows.length)} / ${rows.length}`)
  }
  process.stdout.write('\n')
}

console.log(`uploading to ${new URL(url).host} (run ${run})`)
await upsert('sites', sites, 50)
await upsert(
  'titles',
  titles.map((t) => ({ ...t, run })),
  1000
)
await upsert(
  'title_groups',
  groups.map((g) => ({ ...g, run })),
  500
)
// what earlier uploads wrote and this one didn't
const ids = sites.map((s) => s.id).join(',')
await call('DELETE', `titles?run=neq.${run}&site_id=in.(${ids})`)
await call('DELETE', `title_groups?run=neq.${run}`)
await call('DELETE', `sites?id=not.in.(${ids})`)
console.log('done')
