/**
 * Business Weekly Digest — per-business WhatsApp summary.
 *
 * Schedule: Mondays 08:00 WAT (07:00 UTC) — one hour after platform weekly-digest.
 *
 * For each business with a WhatsApp number on file (implicit opt-in):
 *   - Compute last 7 days: revenue paid, outstanding invoices, new customers
 *   - Send the approved `weekly_digest` template via Termii
 *
 * Gated by:
 *   - CRON_SECRET (auth)
 *   - `whatsapp_delivery` feature flag (global + per-business)
 *
 * Idempotent per ISO week — safe to re-run within the same week; the harness
 * will short-circuit with a 'skipped' response.
 */

import { runCron, weeklyKey } from '@/lib/cron'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getWhatsAppProvider, TEMPLATES } from '@/lib/messaging/whatsapp'
import { isFeatureEnabled } from '@/lib/feature-flags'

type BusinessRow = {
  id: string
  user_id: string
  name: string
  whatsapp: string | null
}

type InvoiceRow = {
  id: string
  business_id: string
  customer_id: string | null
  status: string | null
  total: number | null
  paid_at: string | null
  created_at: string
  issue_date: string | null
}

export async function GET(request: Request) {
  return runCron(request, {
    jobName: 'business_weekly_digest',
    idempotencyKey: weeklyKey(),
    handler: async () => {
      // ── Global kill-switch ──
      const globalEnabled = await isFeatureEnabled('whatsapp_delivery')
      if (!globalEnabled) {
        return {
          processedCount: 0,
          successCount: 0,
          failureCount: 0,
          metadata: { reason: 'whatsapp_delivery flag disabled globally' },
        }
      }

      const admin = getSupabaseAdmin()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const adminAny = admin as any

      // ── Window: last 7 days ──
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const weekAgoIso = weekAgo.toISOString()
      const weekAgoDate = weekAgo.toISOString().slice(0, 10)

      // ── Businesses with a WhatsApp number on file ──
      const { data: businesses, error: bizErr } = await adminAny
        .from('businesses')
        .select('id, user_id, name, whatsapp')
        .not('whatsapp', 'is', null)
        .neq('whatsapp', '')

      if (bizErr) {
        throw new Error(`Failed to load businesses: ${bizErr.message}`)
      }

      const rows: BusinessRow[] = businesses ?? []

      if (rows.length === 0) {
        return {
          processedCount: 0,
          successCount: 0,
          failureCount: 0,
          metadata: { reason: 'no businesses with whatsapp number' },
        }
      }

      const provider = getWhatsAppProvider()
      let successCount = 0
      let failureCount = 0
      let skippedFlag = 0
      const errors: Array<{ businessId: string; error: string }> = []

      for (const biz of rows) {
        try {
          // ── Per-business feature gate ──
          const enabledForBiz = await isFeatureEnabled('whatsapp_delivery', {
            userId: biz.user_id,
            businessId: biz.id,
          })
          if (!enabledForBiz) {
            skippedFlag++
            continue
          }

          // ── Fetch last-7d invoices for this business ──
          const { data: invoices, error: invErr } = await adminAny
            .from('invoices')
            .select('id, business_id, customer_id, status, total, paid_at, created_at, issue_date')
            .eq('business_id', biz.id)
            .eq('is_active', true)
            .gte('created_at', weekAgoIso)

          if (invErr) {
            throw new Error(`Invoice load failed: ${invErr.message}`)
          }

          const weekInvoices: InvoiceRow[] = invoices ?? []

          // Revenue: sum of totals where paid in last 7d
          const revenue = weekInvoices
            .filter((i) => i.status === 'paid' && i.paid_at && i.paid_at >= weekAgoDate)
            .reduce((sum, i) => sum + (Number(i.total) || 0), 0)

          // Outstanding: all active, unpaid invoices for this business (any age)
          const { count: outstandingCount, error: outErr } = await adminAny
            .from('invoices')
            .select('id', { count: 'exact', head: true })
            .eq('business_id', biz.id)
            .eq('is_active', true)
            .in('status', ['sent', 'overdue'])

          if (outErr) {
            throw new Error(`Outstanding count failed: ${outErr.message}`)
          }

          // New customers: distinct customer_ids on invoices created this week
          // whose first-ever invoice was also in this week.
          const customerIdsThisWeek = new Set(
            weekInvoices.map((i) => i.customer_id).filter((c): c is string => Boolean(c))
          )

          let newCustomerCount = 0
          if (customerIdsThisWeek.size > 0) {
            // For each unique customer, check if their earliest invoice for this
            // business falls within the 7-day window.
            const { data: firstSeenRows, error: firstSeenErr } = await adminAny
              .from('invoices')
              .select('customer_id, created_at')
              .eq('business_id', biz.id)
              .in('customer_id', Array.from(customerIdsThisWeek))
              .order('created_at', { ascending: true })

            if (firstSeenErr) {
              throw new Error(`New customer lookup failed: ${firstSeenErr.message}`)
            }

            const firstSeenMap = new Map<string, string>()
            for (const row of (firstSeenRows ?? []) as Array<{
              customer_id: string | null
              created_at: string
            }>) {
              if (row.customer_id && !firstSeenMap.has(row.customer_id)) {
                firstSeenMap.set(row.customer_id, row.created_at)
              }
            }

            for (const [, firstSeen] of firstSeenMap) {
              if (firstSeen >= weekAgoIso) newCustomerCount++
            }
          }

          // ── Owner first name for the template salutation ──
          const { data: ownerProfile } = await adminAny
            .from('profiles')
            .select('first_name')
            .eq('id', biz.user_id)
            .maybeSingle()

          const recipientName =
            (ownerProfile?.first_name as string | undefined) || biz.name || 'there'

          // ── Send template ──
          const variables: Record<string, string | number> = {
            [TEMPLATES.weekly_digest.variables[0]]: recipientName,
            [TEMPLATES.weekly_digest.variables[1]]: formatNaira(revenue),
            [TEMPLATES.weekly_digest.variables[2]]: String(outstandingCount ?? 0),
            [TEMPLATES.weekly_digest.variables[3]]: String(newCustomerCount),
          }

          const result = await provider.sendTemplate({
            to: biz.whatsapp!,
            templateName: 'weekly_digest',
            variables,
          })

          if (result.success) {
            successCount++
          } else {
            failureCount++
            errors.push({
              businessId: biz.id,
              error: result.error || 'unknown send failure',
            })
          }

          // Rate limit — matches existing cron convention
          await new Promise((r) => setTimeout(r, 120))
        } catch (err) {
          failureCount++
          const msg = err instanceof Error ? err.message : String(err)
          errors.push({ businessId: biz.id, error: msg })
          console.error(`[business-weekly-digest] ${biz.id}: ${msg}`)
        }
      }

      return {
        processedCount: rows.length,
        successCount,
        failureCount,
        metadata: {
          skippedByFlag: skippedFlag,
          // Keep payload small — first 20 errors only
          errors: errors.slice(0, 20),
        },
      }
    },
  })
}

/** Format NGN currency for the template body. */
function formatNaira(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '₦0'
  return `₦${Math.round(n).toLocaleString('en-NG')}`
}
