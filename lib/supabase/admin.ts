// Lazy Supabase service-role (admin) client.
// Avoids throwing at module-load time during `next build` when env vars aren't
// present. Call getSupabaseAdmin() inside request handlers.
//
// NOTE: This client bypasses Row Level Security. Only use on the server, never
// expose to the browser.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _admin: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _admin
}

// Lazy anon client — for public reads that still go through RLS.
let _anon: SupabaseClient | null = null

export function getSupabaseAnon(): SupabaseClient {
  if (!_anon) {
    _anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return _anon
}
