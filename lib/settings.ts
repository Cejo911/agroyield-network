// Server-side settings helper — reads a single setting from the settings table.
// Returns the string value or null if not found. Uses the admin client to bypass RLS.

import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function getSetting(key: string): Promise<string | null> {
  try {
    const { data } = await (getSupabaseAdmin() as any)
      .from('settings')
      .select('value')
      .eq('key', key)
      .single()
    return data?.value ?? null
  } catch {
    return null
  }
}

export async function getSettings(keys: string[]): Promise<Record<string, string | null>> {
  try {
    const { data } = await (getSupabaseAdmin() as any)
      .from('settings')
      .select('key, value')
      .in('key', keys)
    const map: Record<string, string | null> = {}
    for (const k of keys) map[k] = null
    for (const row of (data ?? [])) {
      map[row.key] = row.value
    }
    return map
  } catch {
    const map: Record<string, string | null> = {}
    for (const k of keys) map[k] = null
    return map
  }
}
