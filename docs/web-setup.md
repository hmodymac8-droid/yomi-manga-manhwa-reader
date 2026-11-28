# Yomi on the web: setup

The web version is the app's own screens in a browser, on free plans only:

| Part | Where | Free plan |
|---|---|---|
| Website (`src/web`, built to `dist-web/`) | Cloudflare Pages, project `yomi-web` | unlimited |
| Site reader (`web/worker`) | Cloudflare Worker `yomi-web-api` | 100,000 requests a day |
| Catalog (`supabase/migrations`) | Supabase | 500 MB (the catalog takes ~135 MB) |
| Pictures | straight from the manga sites (Mangapill's through the Worker) | — |

Your library, progress and follows stay in each visitor's browser. Supported sites (tested from Cloudflare's servers):
MangaFreak, Mangapill, Webtoonclub, Kuramanga, Projectsuki, Azorafly, Olympustaff, Mangadar (`tools/webCatalog.ts`).

## One-time setup

1. **Supabase**: create a free project at supabase.com. Open **SQL Editor**, paste all of
   `supabase/migrations/20261128000100_web_catalog.sql` and press **Run**.
2. **Catalog**: create `.env.local` in the project folder (it is ignored by git, never commit it):
   ```
   SUPABASE_URL=https://<your project>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<Project Settings → API → secret / service_role key>
   ```
   then `npm run web:upload -- "%APPDATA%\manga-reader"` (reads your data folder, never changes it).
3. **Worker**: `cd web/worker` then `npx wrangler deploy`. Its address is
   `https://yomi-web-api.<your subdomain>.workers.dev`.
4. **Website**: create `.env.production` with the three public values:
   ```
   VITE_SUPABASE_URL=https://<your project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<Project Settings → API → anon / publishable key>
   VITE_WORKER_URL=https://yomi-web-api.<your subdomain>.workers.dev
   ```
   then `npm run build:web` and `npx wrangler pages deploy dist-web --project-name yomi-web`.
   If the address isn't `https://yomi-web.pages.dev`, put the real one in `ALLOWED_ORIGINS` in
   `web/worker/wrangler.toml` and deploy the Worker again.

## Safety

- Visitors can only read the catalog, through `search_titles()`, with every limit capped. They can't write anything,
  and can't read the raw `titles` table (`npm run test:db -- <data folder>` checks all of this).
- The service key is only in `.env.local` on your PC. The anon key in the website can only read.
- The Worker fetches only the supported sites over https, checks every redirect, passes nothing of the visitor on,
  answers only Yomi's website, and limits each visitor to 240 requests a minute (`tests/webWorker.test.ts`).
- The website only runs its own scripts, can't be framed and only talks to Supabase and the Worker (`dist-web/_headers`).

## Local development

`YOMI_DATA=<app data folder> npm run dev:web` serves the website on http://localhost:5174 with the real Worker code and
a local copy of the real database (no accounts needed).
