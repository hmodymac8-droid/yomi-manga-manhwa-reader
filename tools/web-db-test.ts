/*
 * Checks the web catalog's database (supabase/migrations) in a local Postgres (PGlite), loaded with the real catalog
 * from a copy of the app's data folder:
 *   - visitors can search, filter and page, and every limit holds;
 *   - visitors can't add, change or delete anything, can't read the raw titles table, can't widen a search;
 *   - how big it is (Supabase's free plan has 500 MB).
 *
 *   node --experimental-strip-types tools/web-db-test.ts <app data folder>
 */
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'
import { buildWebCatalog } from './webCatalog.ts'
import { normalizeTitle } from '../src/core/repair.ts'

const dir = process.argv[2]
const read = (f: string): unknown =>
  existsSync(join(dir, f)) ? JSON.parse(readFileSync(join(dir, f), 'utf8')) : {}
const { sites, titles, groups } = buildWebCatalog(
  read('catalog.json') as Parameters<typeof buildWebCatalog>[0],
  read('series-meta.json') as Parameters<typeof buildWebCatalog>[1],
  read('genre-index.json') as Parameters<typeof buildWebCatalog>[2]
)
console.log(`built: ${sites.length} sites, ${titles.length} titles, ${groups.length} title groups`)

const db = new PGlite({ extensions: { pg_trgm } })
// the roles Supabase has
await db.exec(
  `create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;`
)
await db.exec(readFileSync('supabase/migrations/20261128000100_web_catalog.sql', 'utf8'))

// load as the owner (the upload tool uses the service key, which bypasses the rules the same way)
async function load<T extends object>(table: string, rows: T[], cols: (keyof T)[]): Promise<void> {
  for (let i = 0; i < rows.length; i += 2000) {
    const part = rows.slice(i, i + 2000)
    await db.query(
      `insert into public.${table} (${cols.join(',')}) select * from json_populate_recordset(null::public.${table}, $1::json) x`.replace(
        'select *',
        `select ${cols.map((c) => 'x.' + String(c)).join(',')}`
      ),
      [JSON.stringify(part)]
    )
  }
}
const t0 = Date.now()
await load('sites', sites, [
  'id',
  'name',
  'base_url',
  'lang',
  'chapter_re',
  'image_proxy',
  'sort_order',
  'title_count'
])
await load('titles', titles, ['site_id', 'url', 'title', 'cover', 'title_key'])
await load('title_groups', groups, [
  'title_key',
  'title',
  'cover',
  'cover_fallback',
  'cover_referer',
  'entries',
  'site_ids',
  'n_sites',
  'kind',
  'genres',
  'mix',
  'pos'
])
await db.exec('analyze')
console.log(`loaded in ${Math.round((Date.now() - t0) / 1000)} s`)

const size = await db.query<{ t: string; mb: number }>(
  `select relname as t, round(pg_total_relation_size(oid) / 1048576.0, 1)::float as mb from pg_class
   where relname in ('sites','titles','title_groups') order by 1`
)
const total = size.rows.reduce((n, r) => n + r.mb, 0)
console.log(
  'size MB:',
  size.rows.map((r) => `${r.t} ${r.mb}`).join(', '),
  `· total ${total.toFixed(1)} (free plan: 500)`
)

// everything below runs as a visitor
await db.exec('set role anon')
const search = async (
  args: Record<string, unknown>
): Promise<{
  total: number
  hits: { key: string; title: string; entries: unknown[] }[]
  counts: Record<string, number>
  genres: { name: string; count: number }[]
}> => {
  const r = await db.query<{ r: never }>(
    `select public.search_titles(q => $1, only_sites => $2, sort => $3, off => $4, lim => $5, want_kind => $6, want_genre => $7) as r`,
    [
      args.q ?? '',
      args.sites ?? [],
      args.sort ?? 'mix',
      args.off ?? 0,
      args.lim ?? 60,
      args.kind ?? null,
      args.genre ?? null
    ]
  )
  return r.rows[0].r
}
const refused = async (sql: string, what: string): Promise<void> => {
  await assert.rejects(db.query(sql), undefined, what + ' should be refused')
}

let t = Date.now()
const all = await search({})
console.log(`all: ${all.total} titles, ${all.hits.length} on the page, ${Date.now() - t} ms`)
assert.equal(all.total, groups.length)
assert.equal(all.hits.length, 60)

t = Date.now()
const solo = await search({ q: normalizeTitle('solo leveling') })
console.log(
  `"solo leveling": ${solo.total} found, first: ${solo.hits[0]?.title} (${solo.hits[0]?.entries.length} sites), ${Date.now() - t} ms`
)
assert.ok(solo.total >= 1)
assert.ok(solo.hits.every((h) => h.key.includes('solo') && h.key.includes('leveling')))

const manhwa = await search({ kind: 'manhwa' })
assert.equal(manhwa.total, all.counts.manhwa)
console.log(
  `manhwa: ${manhwa.total} · manga ${all.counts.manga} · manhua ${all.counts.manhua} · genres listed ${all.genres.length}`
)
if (all.genres[0]) {
  const g = await search({ genre: all.genres[0].name })
  assert.equal(g.total, all.genres[0].count)
}
const az = await search({ sort: 'az', lim: 5 })
assert.deepEqual(
  az.hits.map((h) => h.title),
  [...az.hits.map((h) => h.title)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
)
const one = await search({ sites: ['mangafreak'] })
assert.ok(one.total > 0 && one.total < all.total)

// limits hold, whatever is asked
assert.equal((await search({ lim: 100000 })).hits.length, 60, 'page size is capped')
assert.equal((await search({ lim: -5 })).hits.length, 1, 'a page has at least one title')
assert.equal((await search({ off: 1e9 })).hits.length, 0, 'far offsets give nothing')
assert.equal((await search({ q: '%' })).total, all.total, 'a wildcard is just a character')
assert.equal((await search({ q: 'x'.repeat(5000) })).total, 0)
await assert.rejects(
  search({ sites: Array.from({ length: 41 }, (_, i) => 's' + i) }),
  undefined,
  'too many sites'
)

// visitors can't change anything, or read what isn't theirs to read
await refused(
  `insert into public.title_groups (title_key, title, entries, site_ids, n_sites) values ('hacked', 'Hacked', '[{"a":1}]', '{x}', 1)`,
  'adding a title'
)
await refused(`update public.title_groups set title = 'Hacked'`, 'changing titles')
await refused(`delete from public.title_groups`, 'deleting titles')
await refused(`update public.sites set name = 'Hacked'`, 'changing a site')
await refused(
  `insert into public.sites (id, name, base_url) values ('evil', 'Evil', 'https://evil.example/')`,
  'adding a site'
)
await refused(`delete from public.sites`, 'deleting sites')
await refused(`select * from public.titles limit 1`, 'reading the raw titles')
await refused(`truncate public.title_groups`, 'emptying the catalog')
await refused(`create table public.mine (x int)`, 'making tables')
await refused(`alter table public.title_groups disable row level security`, 'turning off the rules')
await db.exec('reset role; set role authenticated')
await refused(`update public.title_groups set title = 'Hacked'`, 'a signed-in user changing titles')
await refused(`select * from public.titles limit 1`, 'a signed-in user reading the raw titles')
await db.exec('reset role')
const still = await db.query<{ n: number }>(
  `select count(*)::int as n from public.title_groups where title = 'Hacked'`
)
assert.equal(still.rows[0].n, 0)
console.log('all checks passed')
