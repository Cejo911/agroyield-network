/**
 * Admin-controllable limit for the Recurring Invoices subsystem (Unicorn #4).
 *
 * Exposes a single tunable so far: `recurring_template_cap` — the maximum
 * number of ACTIVE templates a single business may have at once. Previously
 * hardcoded in app/api/recurring-invoices/route.ts as
 * `const MAX_ACTIVE_PER_BUSINESS = 50`; moved to `settings` on 19 Apr 2026
 * so the founder can raise the cap for an enterprise trial without a
 * redeploy (Bucket C, promoted into the Beta commit).
 *
 * Pattern mirrors lib/usage-tracking.ts (60s in-memory cache, SAFE_DEFAULT
 * fallback on any error, never throws). Server-only — uses service-role
 * client.
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin'

const SETTINGS_KEY = 'recurring_template_cap'

/** Fallback if the settings row is missing or malformed. Matches the seed
 *  in 20260419_admin_controllable_settings.sql so first-deploy behaviour is
 *  identical to the pre-migration constant. */
export const SAFE_DEFAULT_RECURRING_CAP = 50

/** Absolute bounds enforced on both read-normaliser and write-validator.
 *  1 = admin can effectively disable a business's recurring feature by
 *  tightening; 1000 = hard ceiling so a typo doesn't effectively remove
 *  the guardrail that exists to prevent wallet-drain from a scripted
 *  500-invoice loop. */
export const RECURRING_CAP_MIN = 1
export const RECURRING_CAP_MAX = 1000

const CACHE_TTL_MS = 60 * 1000
let cached: { cap: number; fetchedAt: number } | null = null

/**
 * Returns the current per-business active-template cap. Cached in-process
 * for 60s. Never throws — falls back to SAFE_DEFAULT_RECURRING_CAP on any
 * error or out-of-range value.
 */
export async function getRecurringTemplateCap(): Promise<number> {
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.cap
  }

  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle()

    if (error || !data) {
      cached = { cap: SAFE_DEFAULT_RECURRING_CAP, fetchedAt: Date.now() }
      return SAFE_DEFAULT_RECURRING_CAP
    }

    const raw = (data as { value: unknown }).value
    const parsed =
      typeof raw === 'string' ? Number(raw.trim()) : typeof raw === 'number' ? raw : NaN

    const cap =
      Number.isInteger(parsed) && parsed >= RECURRING_CAP_MIN && parsed <= RECURRING_CAP_MAX
        ? parsed
        : SAFE_DEFAULT_RECURRING_CAP

    cached = { cap, fetchedAt: Date.now() }
    return cap
  } catch {
    cached = { cap: SAFE_DEFAULT_RECURRING_CAP, fetchedAt: Date.now() }
    return SAFE_DEFAULT_RECURRING_CAP
  }
}

/** Test-only: clear the cap cache. */
export function __clearRecurringCapCache(): void {
  cached = null
}
