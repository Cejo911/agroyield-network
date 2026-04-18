/**
 * Usage Reset Cron — Unicorn #5 companion.
 *
 * Schedule: 00:15 Africa/Lagos on the 1st of each month.
 * Set in vercel.json as `0 23 L * *` (last-day of month at 23:00 UTC
 * ≈ 00:00 WAT on the 1st) or the closest supported cron expression.
 *
 * Design note: usage_tracking uses `period_yyyymm` as part of a unique
 * key, so counters roll over NATURALLY — a new month simply inserts a
 * new row with count=1 when the first event of that month fires.
 * Nothing needs to be zeroed or deleted for the feature to work.
 *
 *
 *   (1) Observability. Logs a single per-feature summary of the month
 *       that just ended: total events, unique businesses, cost signal
 *       (useful for the admin dashboard and billing reconciliation).
 *   (2) A defensive hook. If we ever need to reset counters mid-month
 *       (e.g. a bug double-charged users and we comped everyone), this
 *       route is the natural place to implement the reset flag logic.
 *   (3) Retention policy. Prune usage_tracking rows older than 12 months
 *       so the table stays small. Aggregate metrics are preserved in
 *       app logs / analytics long before that cutoff.
 *
 * Idempotent per UTC month (monthlyKey).
 */

import { runCron, monthlyKey } from '@/lib/cron'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

interface FeatureSummary {
  feature_key: string
  count_sum: number
  businesses_touched: number
}

function priorMonthYyyymm(now: Date = new Date()): string {
  // "YYYY-MM" for the month BEFORE the current UTC month.
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth() // 0..11, already points at current month; prior = -1
  const prior = new Date(Date.UTC(year, month - 1, 1))
  const y = prior.getUTCFullYear()
  const m = String(prior.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function cutoffYyyymm(now: Date = new Date(), monthsBack = 12): string {
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  const cutoff = new Date(Date.UTC(y, m - monthsBack, 1))
  return `${cutoff.getUTCFullYear()}-${String(cutoff.getUTCMonth() + 1).padStart(2, '0')}`
}

export async function GET(request: Request) {
  return runCron(request, {
    jobName: 'usage_reset',
    idempotencyKey: monthlyKey(),
    handler: async () => {
      const admin = getSupabaseAdmin()
      const lastMonth = priorMonthYyyymm()
      const cutoff = cutoffYyyymm()

      // 1. Per-feature summary for the just-completed month. Log for
      //    later ingest into analytics; the cron log itself retains the
      //    return value so we have it in Supabase.
      const { data: priorRows, error: readErr } = await admin
        .from('usage_tracking')
        .select('feature_key, business_id, count')
        .eq('period_yyyymm', lastMonth)

      const summary: FeatureSummary[] = []
      if (!readErr && Array.isArray(priorRows)) {
        const grouped = new Map<string, { count: number; businesses: Set<string> }>()
        for (const r of priorRows as Array<{ feature_key: string; business_id: string; count: number }>) {
          const g = grouped.get(r.feature_key) ?? { count: 0, businesses: new Set<string>() }
          g.count += Number(r.count ?? 0)
          g.businesses.add(r.business_id)
          grouped.set(r.feature_key, g)
        }
        for (const [key, g] of grouped.entries()) {
          summary.push({
            feature_key: key,
            count_sum: g.count,
            businesses_touched: g.businesses.size,
          })
        }
      }
      for (const s of summary) {
        console.log('[usage-reset] summary', lastMonth, s.feature_key, s)
      }

      // 2. Retention: prune rows older than 12 months.
      //    We keep the current + last 12 months so trailing-year charts
      //    work without surprise gaps. Earlier data is already in cron
      //    logs above + any analytics pipeline we stand up later.
      let prunedCount = 0
      const { data: pruned, error: pruneErr } = await admin
        .from('usage_tracking')
        .delete()
        .lt('period_yyyymm', cutoff)
        .select('id')
      if (pruneErr) {
        console.warn('[usage-reset] prune failed (continuing):', pruneErr)
      } else {
        prunedCount = Array.isArray(pruned) ? pruned.length : 0
      }

      return {
        processedCount: summary.reduce((s, r) => s + r.count_sum, 0),
        successCount: summary.length,
        failureCount: 0,
        metadata: {
          prior_month: lastMonth,
          summary,
          retention_cutoff: cutoff,
          rows_pruned: prunedCount,
        },
      }
    },
  })
}
