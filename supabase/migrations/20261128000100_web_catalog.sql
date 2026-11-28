-- Yomi on the web: the shared catalog (the sites and their titles) that everyone can search.
--
-- Safety rules, in short:
--   * Visitors (the "anon" and "authenticated" roles) can only READ, and only through what is granted below.
--     Nothing here can be inserted, changed or deleted by them: no write policies, and write rights are revoked.
--   * Only the upload tool / scheduled scans, using the service key (never in the website), write these tables.
--   * The search function caps everything it is asked (query length, page size, offset) and runs as the caller,
--     so the row level security below still applies to it.
--   * Each user's own library stays in their browser for now: no personal data is stored here.

create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

-- One manga site the web version reads.
create table public.sites (
  id text primary key check (id ~ '^[a-z0-9-]{2,60}$'),
  name text not null check (length(name) between 1 and 80),
  base_url text not null check (base_url ~ '^https://[a-z0-9.-]+/$'),
  lang text not null default 'en' check (lang in ('ar', 'en', 'other')),
  -- the site's chapter-link pattern (SourceDef.chapterRe in the app)
  chapter_re text not null default '' check (length(chapter_re) <= 500),
  -- its pictures refuse other sites, so they go through the Worker
  image_proxy boolean not null default false,
  sort_order integer not null default 0,
  title_count integer not null default 0 check (title_count >= 0),
  updated_at timestamptz not null default now()
);

-- One title on one site.
create table public.titles (
  site_id text not null references public.sites (id) on delete cascade,
  url text not null check (url ~ '^https://' and length(url) <= 600),
  title text not null check (length(title) between 1 and 300),
  cover text not null default '' check (length(cover) <= 1000),
  -- normalizeTitle(title) from src/core/repair.ts: the same title on two sites has the same key
  title_key text not null check (length(title_key) <= 300),
  -- which upload wrote it: rows an upload didn't write any more are removed at its end
  run text not null default '',
  primary key (site_id, url)
);
create index titles_key on public.titles (title_key);

-- One title as it appears across all sites: what the search reads. Rebuilt by the upload tool.
create table public.title_groups (
  title_key text primary key check (length(title_key) <= 300),
  title text not null check (length(title) between 1 and 300),
  cover text not null default '' check (length(cover) <= 1000),
  cover_fallback text not null default '' check (length(cover_fallback) <= 1000),
  cover_referer text not null default '' check (length(cover_referer) <= 200),
  -- [{ "sourceId", "sourceName", "url" }], the best site first
  entries jsonb not null check (jsonb_typeof(entries) = 'array' and jsonb_array_length(entries) between 1 and 40),
  site_ids text[] not null,
  n_sites integer not null check (n_sites >= 1),
  kind text check (kind in ('manga', 'manhwa', 'manhua')),
  genres text[] not null default '{}',
  -- a fixed pseudo-random number, for the "mixed" order
  mix integer not null default 0,
  -- position on its first site (the site's own order)
  pos integer not null default 0,
  run text not null default ''
);
create index title_groups_key_trgm on public.title_groups using gin (title_key extensions.gin_trgm_ops);
create index title_groups_sites on public.title_groups using gin (site_ids);
create index title_groups_genres on public.title_groups using gin (genres);
create index title_groups_mix on public.title_groups (mix);
create index title_groups_title on public.title_groups (title);

-- ---------------------------------------------------------------------------------------------------------------------
-- Who may do what
-- ---------------------------------------------------------------------------------------------------------------------
alter table public.sites enable row level security;
alter table public.titles enable row level security;
alter table public.title_groups enable row level security;

-- reading is open to everyone; there are no insert/update/delete policies, so those are refused for everyone but
-- the service key (which bypasses row level security and is only used by the upload tool and scans)
create policy "anyone can read sites" on public.sites for select to anon, authenticated using (true);
create policy "anyone can read title groups" on public.title_groups for select to anon, authenticated using (true);

revoke all on public.sites, public.titles, public.title_groups from anon, authenticated;
grant select on public.sites, public.title_groups to anon, authenticated;
-- titles (one row per site) are kept for the scans only: visitors can't read them at all

-- ---------------------------------------------------------------------------------------------------------------------
-- Search: the same as the app's (every word of the query inside the title), with type / genre / site filters
-- ---------------------------------------------------------------------------------------------------------------------
create or replace function public.search_titles(
  q text default '',
  only_sites text[] default '{}',
  sort text default 'mix',
  off integer default 0,
  lim integer default 60,
  want_kind text default null,
  want_genre text default null
) returns jsonb
language plpgsql
stable
security invoker
set search_path = public, extensions
as $$
declare
  words text[];
  n_off integer := least(greatest(coalesce(off, 0), 0), 100000);
  n_lim integer := least(greatest(coalesce(lim, 60), 1), 60);
  result jsonb;
begin
  -- the query arrives already normalised by the website (normalizeTitle); still: short, and only its words
  words := array(
    select w from unnest(string_to_array(left(coalesce(q, ''), 100), ' ')) as w where length(w) > 0 limit 8
  );
  if coalesce(array_length(only_sites, 1), 0) > 40 then
    raise exception 'too many sites';
  end if;

  with base as (
    select g.*
    from title_groups g
    where (coalesce(array_length(words, 1), 0) = 0
           or g.title_key like all (array(select '%' || replace(replace(w, '%', ''), '_', '') || '%' from unnest(words) w)))
      and (coalesce(array_length(only_sites, 1), 0) = 0 or g.site_ids && only_sites)
  ),
  filtered as (
    select * from base
    where (want_kind is null or kind = want_kind)
      and (want_genre is null
           or (want_genre = '__none__' and cardinality(genres) = 0)
           or (want_genre <> '__none__' and genres @> array[want_genre]))
  ),
  page as (
    select * from filtered
    order by
      case when sort = 'az' then title end asc,
      case when sort = 'za' then title end desc,
      case when sort = 'sites' then n_sites end desc,
      case when sort = 'site' then pos end asc,
      -- a search shows the closest names first (the fewest extra letters)
      case when sort = 'mix' and coalesce(array_length(words, 1), 0) > 0 then length(title_key) end asc,
      mix asc, title_key asc
    offset n_off limit n_lim
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'hits', coalesce((select jsonb_agg(jsonb_build_object(
        'key', title_key, 'title', title, 'cover', cover, 'coverFallback', cover_fallback,
        'needsInfo', false, 'coverReferer', cover_referer, 'entries', entries)) from page), '[]'::jsonb),
    'counts', jsonb_build_object(
      'manga', (select count(*) from base where kind = 'manga'
                and (want_genre is null or genres @> array[want_genre])),
      'manhwa', (select count(*) from base where kind = 'manhwa'
                 and (want_genre is null or genres @> array[want_genre])),
      'manhua', (select count(*) from base where kind = 'manhua'
                 and (want_genre is null or genres @> array[want_genre]))),
    'genres', coalesce((select jsonb_agg(jsonb_build_object('name', name, 'count', n) order by n desc, name)
       from (select gname as name, count(*) as n
             from base, unnest(genres) as gname
             where want_kind is null or kind = want_kind
             group by gname order by count(*) desc, gname limit 80) x), '[]'::jsonb),
    'noGenre', (select count(*) from base where cardinality(genres) = 0 and (want_kind is null or kind = want_kind))
  ) into result;
  return result;
end;
$$;

revoke all on function public.search_titles(text, text[], text, integer, integer, text, text) from public;
grant execute on function public.search_titles(text, text[], text, integer, integer, text, text) to anon, authenticated;
