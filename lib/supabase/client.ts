import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Module-scoped singleton. createClient() previously returned a fresh
// browser client on every call; with N components on a page each calling
// it (community-client + CommentsSection + nav + …), we ended up with N
// LockManager instances all racing for the same auth-token lock name.
// On iOS Safari the tab suspend/resume cycle made this loud — when the
// tab woke, multiple instances kicked off simultaneous token refreshes,
// one stole the lock mid-flight, and the loser surfaced as an
// unhandledrejection in Sentry:
//
//   Lock "lock:sb-<project>-auth-token" was released because another
//   request stole it
//
// The lock contention is internal to Supabase's auth client and isn't
// fatal — sessions still refresh successfully — but the noise is real
// and it pollutes the Sentry feed during launch monitoring. Caching
// the instance gives us one LockManager per tab, which is what the
// Web Locks API was designed for. Cross-tab coordination still works
// because each tab has its own JS context but shares the
// browser-level lock namespace.
//
// HMR safety: Next dev server re-imports the module on edits, which
// resets `_client` to undefined. Expected and harmless — the next
// call repopulates it.
//
// Type note: we type the cache as SupabaseClient<any, "public", any>
// rather than ReturnType<typeof createBrowserClient>. The latter
// resolves a generic-with-defaults differently than direct call-site
// inference, which subtly broadened destructured callback params
// (e.g. `({ data: { user } })` from auth.getUser()) to implicit any
// across ~20 components. Using the supabase-js exported type matches
// what the original non-memoized signature surfaced.
let _client: SupabaseClient | undefined

export function createClient(): SupabaseClient {
  return (_client ??= createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ))
}
