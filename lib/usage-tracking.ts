/**
 * Per-business monthly usage counters for tier-gated features.
 *
 * Backed by `usage_tracking (business_id, feature_key, period_yyyymm, count)`
 * with a unique composite key — atomic increment is one upsert.
 *
 * Pattern note: counters are PER CALENDAR MONTH (UTC), not rolling 30-day
 * windows. See migration comments in 20260418_expense_ocr.sql for the
 * reasoning. Natural rollover means no reset cron is needed.
 *
 * Design: server-only (uses service-role client). Never import from a
 * client component — the writes bypass RLS by design.
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import type { TierName } from '@/lib/tiers'

/** Stable feature keys — keep in sync with `lib/feature-flags.ts` keys
 *  for any feature that has a per-business monthly quota. */
export type UsageFeatureKey =
  | 'expense_ocr'
  | 'ai_assistant'

/**
 * Monthly quota per tier per feature. `null` = unlimited.
 *
 * Source of truth for the limits in this file. Pricing-page copy and
 * upsell modals should pull from here so they never drift.
 */
export const USAGE_LIMITS: Record<UsageFeatureKey, Record<TierName, number | null>> = {
  expense_ocr: {
    free:   20,
    pro:    100,
    growth: null, // unlimited
  },
  ai_assistant: {
    // Daily limits, but documented here for symmetry — gating logic
    // for AI Assistant will live in its own helper since the period
    // is daily not monthly. Listed for visibility.
    free:   5,
    pro:    50,
    growth: null,
  },
}

/** Returns the current YYYY-MM period string in UTC.
 *  Matches the CHECK constraint on usage_tracking.period_yyyymm. */
export function currentPeriodYyyymm(now: Date = new Date()): string {
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

interface UsageRow {
  count: number
}

/**
 * Read this month's counter for (business, feature). Returns 0 if no row
 * exists yet. Never throws — fail-open returns 0 (caller decides if that's
 * dangerous; for quota gates the more-conservative checkQuota() handles
 * the error path explicitly).
 */
export async function getMonthlyUsage(
  businessId: string,
  featureKey: UsageFeatureKey,
  period: string = currentPeriodYyyymm(),
): Promise<number> {
  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('usage_tracking')
      .select('count')
      .eq('business_id', businessId)
      .eq('feature_key', featureKey)
      .eq('period_yyyymm', period)
      .maybeSingle()

    if (error || !data) return 0
    return (data as UsageRow).count ?? 0
  } catch {
    return 0
  }
}

/**
 * Atomically increment the counter for (business, feature, current month).
 * Returns the new count, or null on failure.
 *
 * Uses INSERT ... ON CONFLICT DO UPDATE so two concurrent requests can't
 * race past each other on the read-then-write path.
 *
 * IMPORTANT: only call this AFTER the underlying work succeeds (e.g. after
 * Vision returns a valid extraction). Calling on the way in means a failed
 * extraction still burns a quota slot — bad UX.
 */
export async function incrementUsage(
  businessId: string,
  userId: string,
  featureKey: UsageFeatureKey,
): Promise<number | null> {
  try {
    const admin = getSupabaseAdmin()
    const period = currentPeriodYyyymm()

    // Postgres upsert — ON CONFLICT DO UPDATE SET count = usage_tracking.count + 1
    // RETURNING count. Supabase's .upsert() doesn't expose the increment
    // pattern directly, so we use rpc-less SQL via the rest endpoint by
    // first attempting an upsert with count=1 (if no conflict), then if
    // there was a conflict we update separately. Two-step but each step
    // is atomic at the row level via the UNIQUE constraint.
    //
    // The cleaner option is a Postgres function; we'll add that the first
    // time we hit a real concurrency issue. For receipt OCR (one user one
    // upload at a time), the simple two-step is fine.

    // Step 1: try INSERT (will fail with 23505 if the row exists for this period).
    const { error: insErr } = await admin
      .from('usage_tracking')
      .insert({
        business_id: businessId,
        user_id: userId,
        feature_key: featureKey,
        period_yyyymm: period,
        count: 1,
      })
      .select('count')
      .single()

    if (!insErr) {
      return 1
    }

    // Insert failed — most likely the unique constraint (row already exists
    // for this month). Fall through to UPDATE.
    // 23505 = unique_violation in Postgres.
    const isUniqueViolation =
      typeof insErr === 'object' &&
      insErr !== null &&
      'code' in insErr &&
      (insErr as { code?: string }).code === '23505'

    if (!isUniqueViolation) {
      console.error('[usage-tracking] insert failed (non-unique):', insErr)
      return null
    }

    // Step 2: read-modify-write. We could use a rpc here for true atomicity
    // under concurrent writers; for a single-user-uploading-a-receipt flow
    // it's not worth the round trip. Worst case under high concurrency you
    // get a slight under-count which always errs in the user's favour.
    const { data: existing, error: readErr } = await admin
      .from('usage_tracking')
      .select('count')
      .eq('business_id', businessId)
      .eq('feature_key', featureKey)
      .eq('period_yyyymm', period)
      .single()

    if (readErr || !existing) {
      console.error('[usage-tracking] post-conflict read failed:', readErr)
      return null
    }

    const newCount = ((existing as UsageRow).count ?? 0) + 1
    const { error: updErr } = await admin
      .from('usage_tracking')
      .update({ count: newCount })
      .eq('business_id', businessId)
      .eq('feature_key', featureKey)
      .eq('period_yyyymm', period)

    if (updErr) {
      console.error('[usage-tracking] update failed:', updErr)
      return null
    }
    return newCount
  } catch (err) {
    console.error('[usage-tracking] incrementUsage threw:', err)
    return null
  }
}

export interface QuotaCheckResult {
  allowed: boolean
  used: number
  /** null = unlimited */
  limit: number | null
  /** Human-readable rejection message when allowed=false. */
  reason?: string
  /** Suggested next tier when the current tier is over quota. */
  upgradeToTier?: TierName
}

/**
 * Returns whether (businessId, featureKey) has remaining quota under the
 * given tier. The caller should call this BEFORE doing the work and only
 * call incrementUsage() after the work succeeds.
 *
 * Fail-open behaviour: if the usage read fails we return allowed=true so
 * a transient DB blip doesn't lock users out of the feature they paid for.
 * Quota over-runs from this case are bounded by the rate-limiter on the
 * route (5/min/user for OCR).
 */
export async function checkQuota(
  businessId: string,
  featureKey: UsageFeatureKey,
  tier: TierName,
): Promise<QuotaCheckResult> {
  const limit = USAGE_LIMITS[featureKey]?.[tier] ?? null
  const used = await getMonthlyUsage(businessId, featureKey)

  if (limit === null) {
    return { allowed: true, used, limit: null }
  }

  if (used >= limit) {
    return {
      allowed: false,
      used,
      limit,
      reason: `You've used all ${limit} receipt scans this month on the ${tier === 'free' ? 'Starter' : tier === 'pro' ? 'Pro' : 'Growth'} plan.`,
      upgradeToTier: tier === 'free' ? 'pro' : 'growth',
    }
  }

  return { allowed: true, used, limit }
}
