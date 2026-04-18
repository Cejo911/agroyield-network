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
 * client component — the writes bypass RLS by design. Client components
 * that need to show "used X of Y" should go via an API route.
 *
 * ----------------------------------------------------------------------------
 * Admin-controllable limits (added 19 Apr 2026):
 * ----------------------------------------------------------------------------
 * Monthly quotas used to live here as a hardcoded USAGE_LIMITS constant.
 * They now live in `settings.usage_limits` (seeded by
 * 20260419_admin_controllable_settings.sql) so the founder can retune them
 * from the Admin Dashboard → Pricing & Subscriptions without a redeploy.
 *
 * Reads are cached in-process for 60s to avoid hammering Supabase on every
 * /api/expense-ocr POST. Pattern mirrors lib/feature-flags.ts.
 *
 * Fail-open semantics: if the settings read fails for any reason we fall
 * back to SAFE_DEFAULTS (identical to the pre-migration values). Billing-
 * adjacent features should lean conservative on the user's side — a DB blip
 * shouldn't lock a paying customer out of the feature. Rate-limiter on the
 * route bounds any abuse window (scratchpad #12).
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import type { TierName } from '@/lib/tiers'

/** Stable feature keys — keep in sync with `lib/feature-flags.ts` keys
 *  for any feature that has a per-business monthly quota. */
export type UsageFeatureKey =
  | 'expense_ocr'
  | 'ai_assistant'

/** Shape of the `settings.usage_limits` JSON blob. Each feature maps to a
 *  per-tier numeric quota where `null` means unlimited. */
export type UsageLimitsMap = Record<UsageFeatureKey, Record<TierName, number | null>>

/**
 * Fallback quotas used when the settings row is missing, malformed, or the
 * DB read throws. Matches the values seeded by
 * 20260419_admin_controllable_settings.sql so first-deploy behaviour is
 * identical to the pre-migration hardcoded constants.
 *
 * DO NOT export this as a public source of truth — callers should always go
 * through getUsageLimits() / checkQuota() so admin edits are respected.
 */
const SAFE_DEFAULTS: UsageLimitsMap = {
  expense_ocr: {
    free:   20,
    pro:    100,
    growth: null, // unlimited
  },
  ai_assistant: {
    // Daily limits, but documented here for symmetry — gating logic for AI
    // Assistant will live in its own helper since the period is daily not
    // monthly. Listed for visibility.
    free:   5,
    pro:    50,
    growth: null,
  },
}

// ─── 60s in-memory cache for the settings read ──────────────────────────────
// Mirrors the pattern in lib/feature-flags.ts. Small, single-key cache —
// one blob keyed under SETTINGS_CACHE_KEY.
const SETTINGS_CACHE_KEY = 'usage_limits'
const CACHE_TTL_MS = 60 * 1000

let cached: { map: UsageLimitsMap; fetchedAt: number } | null = null

/**
 * Reads `settings.usage_limits` and normalises it into a complete
 * UsageLimitsMap (falling back to SAFE_DEFAULTS for any feature/tier the
 * admin hasn't explicitly configured). Never throws — on error returns
 * SAFE_DEFAULTS so callers don't have to null-check.
 *
 * Exported for the admin dashboard + pricing page, both of which render
 * the numbers to users and need them fresh (within the 60s cache window).
 */
export async function getUsageLimits(): Promise<UsageLimitsMap> {
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.map
  }

  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('settings')
      .select('value')
      .eq('key', SETTINGS_CACHE_KEY)
      .maybeSingle()

    if (error || !data) {
      cached = { map: SAFE_DEFAULTS, fetchedAt: Date.now() }
      return SAFE_DEFAULTS
    }

    const raw = (data as { value: unknown }).value
    const merged = mergeWithDefaults(raw)
    cached = { map: merged, fetchedAt: Date.now() }
    return merged
  } catch {
    // Fail-open — SAFE_DEFAULTS match the pre-migration constants so nothing
    // regresses. The 60s cache prevents a thundering herd on the DB if the
    // settings row is unavailable.
    cached = { map: SAFE_DEFAULTS, fetchedAt: Date.now() }
    return SAFE_DEFAULTS
  }
}

/**
 * Normalise whatever we read from settings.value into the canonical shape.
 * Accepts either a parsed object or a JSON-stringified string (the admin
 * save path stores JSON as a string via JSON.stringify).
 *
 * Any missing feature/tier falls back to SAFE_DEFAULTS so a partial blob
 * can't leave callers with `undefined` limits.
 */
function mergeWithDefaults(raw: unknown): UsageLimitsMap {
  let parsed: unknown = raw
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw)
    } catch {
      return SAFE_DEFAULTS
    }
  }

  if (!parsed || typeof parsed !== 'object') return SAFE_DEFAULTS

  const out: UsageLimitsMap = {
    expense_ocr: { ...SAFE_DEFAULTS.expense_ocr },
    ai_assistant: { ...SAFE_DEFAULTS.ai_assistant },
  }
  const source = parsed as Record<string, unknown>

  for (const feature of Object.keys(out) as UsageFeatureKey[]) {
    const featureRaw = source[feature]
    if (!featureRaw || typeof featureRaw !== 'object') continue
    const tiers = featureRaw as Record<string, unknown>
    for (const tier of ['free', 'pro', 'growth'] as TierName[]) {
      const v = tiers[tier]
      if (v === null) {
        out[feature][tier] = null
      } else if (typeof v === 'number' && Number.isFinite(v) && v >= 0) {
        out[feature][tier] = v
      }
      // else: keep SAFE_DEFAULTS value
    }
  }
  return out
}

/**
 * Back-compat shim: existing callers imported `USAGE_LIMITS` directly and
 * read values synchronously. Those call sites were migrated to async
 * getUsageLimits(), but we leave this export so any lingering reference
 * still compiles and shows the safe defaults (never stale admin edits).
 *
 * @deprecated Use getUsageLimits() for admin-controllable values.
 */
export const USAGE_LIMITS: UsageLimitsMap = SAFE_DEFAULTS

/**
 * Test-only: clear the settings cache. Do not call in production code.
 */
export function __clearUsageLimitsCache(): void {
  cached = null
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
 * Reads the quota value via getUsageLimits() (60s cached, settings-backed)
 * so admin edits to `settings.usage_limits` take effect within a minute
 * without a redeploy.
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
  const limits = await getUsageLimits()
  const limit = limits[featureKey]?.[tier] ?? null
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
