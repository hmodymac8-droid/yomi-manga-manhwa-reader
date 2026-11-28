/*
 * Where the web version finds its two helpers. All three values are public by design (they end up in the page):
 *   - the Supabase project address and its "anon" key, which can only read the catalog (see supabase/migrations)
 *   - the Worker that fetches the manga sites (web/worker)
 * Set them when building (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_WORKER_URL). Empty means the local dev
 * server, which answers both itself (vite.web.config.ts).
 * The Supabase service key is never here: it is only for the upload tool, on your own computer or in GitHub secrets.
 */
const env = import.meta.env as Record<string, string | undefined>

export const SUPABASE_URL = (env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '')
export const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY ?? ''
export const WORKER_URL = (env.VITE_WORKER_URL ?? '/api').replace(/\/$/, '')
