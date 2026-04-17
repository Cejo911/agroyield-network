/**
 * Feature flag reader.
 *
 * Use server-side only (reads from Supabase with service/anon key).
 * Supports global, per-user, per-business, and percentage rollout.
 */

import { createClient } from '@supabase/supabase-js'

export type FeatureFlagKey =
  | 'weekly_digest'
  | 'public_business_pages'
  | 'whatsapp_delivery'
  | 'recurring_invoices'
  | 'expense_ocr'
  | 'agri_credit_score'
  | 'ai_assistant'
  | 'cooperatives'

interface FeatureFlagRow {
  key: string
  is_enabled: boolean
  enabled_for_users: string[]
  enabled_for_businesses: string[]
  rollout_percentage: number
}

interface FlagContext {
  userId?: string
  businessId?: string
}

// Lightweight in-memory cache to avoid hammering Supabase on every call.
// Invalidates after 60s so flag changes propagate within a minute.
const cache = new Map<string, { row: FeatureFlagRow | null; fetchedAt: number }>()
const CACHE_TTL_MS = 60 * 1000

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

async function loadFlag(key: FeatureFlagKey): Promise<FeatureFlagRow | null> {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.row
  }

  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('feature_flags')
    .select('key, is_enabled, enabled_for_users, enabled_for_businesses, rollout_percentage')
    .eq('key', key)
    .maybeSingle()

  const row = error ? null : (data as FeatureFlagRow | null)
  cache.set(key, { row, fetchedAt: Date.now() })
  return row
}

/**
 * Check if a feature is enabled for the given context.
 * Returns false on any error (fail-closed — safer than fail-open).
 */
export async function isFeatureEnabled(
  key: FeatureFlagKey,
  context: FlagContext = {}
): Promise<boolean> {
  try {
    const flag = await loadFlag(key)
    if (!flag) return false

    // Global on
    if (flag.is_enabled) return true

    // Explicit user allowlist
    if (context.userId && flag.enabled_for_users?.includes(context.userId)) {
      return true
    }

    // Explicit business allowlist
    if (
      context.businessId &&
      flag.enabled_for_businesses?.includes(context.businessId)
    ) {
      return true
    }

    // Percentage rollout (deterministic by user ID hash)
    if (flag.rollout_percentage > 0 && context.userId) {
      const bucket = hashToBucket(context.userId)
      if (bucket < flag.rollout_percentage) return true
    }

    return false
  } catch {
    return false // fail closed
  }
}

/**
 * Test-only: clear the flag cache. Do not call in production.
 */
export function __clearFeatureFlagCache(): void {
  cache.clear()
}

/** Deterministic 0–99 bucket from a user ID — same user always gets same bucket. */
function hashToBucket(userId: string): number {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) % 100
}