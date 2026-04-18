/**
 * Recurring Invoices Cron — Unicorn #4.
 *
 * Schedule: 06:00 UTC (07:00 WAT) every day. Set in vercel.json.
 *
 * For each row in `recurring_invoices` where:
 *   status = 'active' AND next_run_on <= today AND
 *   (end_on IS NULL OR end_on >= today) AND
 *   the owner still has Pro+ AND
 *   the `recurring_invoices` feature flag is enabled for them
 *
 *   1. Bump businesses.invoice_counter and assemble the invoice_number
 *   2. Insert an `invoices` row (status='sent') + `invoice_items` rows
 *   3. Try email delivery to customer.email (best-effort — failures are
 *      recorded in last_error but don't prevent invoice creation)
 *   4. Bump next_run_on by cadence; if it'd step past end_on, set status='ended'
 *   5. Increment generated_count, clear last_error on success
 *
 * Per-row try/catch — a single bad row never poisons the rest of the batch.
 * Errors get persisted to `recurring_invoices.last_error` so the user can see
 * them on the list page.
 *
 * WhatsApp delivery is intentionally not wired here — it'll plug in once
 * Termii's recurring-invoice template clears approval (see Unicorn #3).
 *
 * Auth: CRON_SECRET (enforced by runCron harness).
 * Idempotent per UTC day (dailyKey).
 *
 * Kill switches:
 *   - settings.recurring_invoices_enabled = 'false' → entire run is a no-op
 *   - feature flag `recurring_invoices` (enabled_for_users / rollout_percentage)
 *   - status='paused' on a single row pauses just that schedule
 */

import { runCron, dailyKey } from '@/lib/cron'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { getEffectiveTier } from '@/lib/tiers'
import { getResend } from '@/lib/email/client'
import { SENDERS } from '@/lib/email/senders'
import { escapeHtml } from '@/lib/sanitise'

const APP_URL = 'https://agroyield.africa'

type Cadence = 'weekly' | 'monthly' | 'quarterly'

interface RecurringRow {
  id: string
  business_id: string
  user_id: string
  customer_id: string
  cadence: Cadence
  document_type: string | null
  notes: string | null
  apply_vat: boolean
  vat_rate: number | null
  delivery_charge: number | null
  due_days: number | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  line_items: any
  start_on: string
  next_run_on: string
  end_on: string | null
  generated_count: number
}

interface BusinessRow {
  id: string
  user_id: string
  name: string
  invoice_prefix: string | null
  invoice_counter: number | null
}

interface CustomerRow {
  id: string
  name: string
  email: string | null
}

interface ProfileRow {
  id: string
  subscription_tier: string | null
  subscription_expires_at: string | null
}

function todayUtc(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function addCadence(from: Date, cadence: Cadence): Date {
  const d = new Date(from)
  if (cadence === 'weekly') d.setUTCDate(d.getUTCDate() + 7)
  else if (cadence === 'monthly') d.setUTCMonth(d.getUTCMonth() + 1)
  else if (cadence === 'quarterly') d.setUTCMonth(d.getUTCMonth() + 3)
  return d
}

function computeTotals(items: Array<{ quantity: number; unit_price: number }>, opts: {
  applyVat: boolean
  vatRate: number
  deliveryCharge: number
}) {
  const subtotal = items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0)
  const preVatTotal = subtotal + opts.deliveryCharge
  const vatAmount = opts.applyVat ? preVatTotal * (opts.vatRate / 100) : 0
  const total = preVatTotal + vatAmount
  return { subtotal, vatAmount, total }
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', minimumFractionDigits: 2,
  }).format(n).replace('NGN', '₦')
}

function buildInvoiceEmail(opts: {
  customerName: string
  businessName: string
  invoiceNumber: string
  total: number
  invoiceUrl: string
  dueDate: string | null
}): { subject: string; html: string } {
  const dueLine = opts.dueDate
    ? `<p style="margin:0 0 12px 0;color:#374151;">Due by <strong>${escapeHtml(opts.dueDate)}</strong>.</p>`
    : ''
  const subject = `Invoice ${opts.invoiceNumber} from ${opts.businessName}`
  const html = `
<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,sans-serif;background:#f9fafb;margin:0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;">
    <h1 style="margin:0 0 8px 0;font-size:20px;color:#111827;">Hi ${escapeHtml(opts.customerName)},</h1>
    <p style="margin:0 0 16px 0;color:#374151;line-height:1.5;">
      ${escapeHtml(opts.businessName)} has issued you a new invoice as part of your recurring schedule.
    </p>
    <div style="background:#f3f4f6;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 4px 0;font-size:13px;color:#6b7280;">Invoice number</p>
      <p style="margin:0 0 12px 0;font-weight:600;color:#111827;">${escapeHtml(opts.invoiceNumber)}</p>
      <p style="margin:0 0 4px 0;font-size:13px;color:#6b7280;">Amount</p>
      <p style="margin:0;font-weight:700;color:#15803d;font-size:18px;">${escapeHtml(formatCurrency(opts.total))}</p>
    </div>
    ${dueLine}
    <p style="margin:24px 0 0 0;">
      <a href="${escapeHtml(opts.invoiceUrl)}"
         style="display:inline-block;background:#15803d;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;">
        View invoice
      </a>
    </p>
    <p style="margin:24px 0 0 0;font-size:12px;color:#9ca3af;">
      Sent automatically by AgroYield Network on behalf of ${escapeHtml(opts.businessName)}.
    </p>
  </div>
</body></html>`.trim()
  return { subject, html }
}

export async function GET(request: Request) {
  return runCron(request, {
    jobName: 'recurring_invoices',
    idempotencyKey: dailyKey(),
    handler: async () => {
      const admin = getSupabaseAdmin()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const adminAny = admin as any

      // Admin kill-switch
      const { data: killSetting } = await adminAny
        .from('settings').select('value').eq('key', 'recurring_invoices_enabled').maybeSingle()
      if (killSetting?.value === 'false') {
        return {
          processedCount: 0,
          metadata: { skipped_reason: 'Recurring invoices disabled in admin settings' },
        }
      }

      const today = todayUtc()
      const todayStr = toDateOnly(today)

      // Fetch all due rows. Cap at 500/day — well above expected volume
      // for the launch cohort, and a safety net so a runaway loop can't
      // generate thousands of invoices in one tick.
      const { data: rowsData, error: rowsErr } = await adminAny
        .from('recurring_invoices')
        .select(`
          id, business_id, user_id, customer_id, cadence,
          document_type, notes, apply_vat, vat_rate, delivery_charge, due_days,
          line_items, start_on, next_run_on, end_on, generated_count
        `)
        .eq('status', 'active')
        .lte('next_run_on', todayStr)
        .or(`end_on.is.null,end_on.gte.${todayStr}`)
        .limit(500)

      if (rowsErr) throw new Error(`Failed to fetch recurring invoices: ${rowsErr.message}`)
      const rows = (rowsData ?? []) as RecurringRow[]

      if (rows.length === 0) {
        return { processedCount: 0, successCount: 0, failureCount: 0 }
      }

      // Bulk pre-fetch businesses, customers, profiles to avoid N+1.
      const businessIds = Array.from(new Set(rows.map(r => r.business_id)))
      const customerIds = Array.from(new Set(rows.map(r => r.customer_id)))
      const userIds     = Array.from(new Set(rows.map(r => r.user_id)))

      const [bizRes, custRes, profRes] = await Promise.all([
        adminAny.from('businesses')
          .select('id, user_id, name, invoice_prefix, invoice_counter')
          .in('id', businessIds),
        adminAny.from('customers')
          .select('id, name, email')
          .in('id', customerIds),
        adminAny.from('profiles')
          .select('id, subscription_tier, subscription_expires_at')
          .in('id', userIds),
      ])

      const businessById = new Map<string, BusinessRow>()
      for (const b of (bizRes.data ?? []) as BusinessRow[]) businessById.set(b.id, b)
      const customerById = new Map<string, CustomerRow>()
      for (const c of (custRes.data ?? []) as CustomerRow[]) customerById.set(c.id, c)
      const profileById = new Map<string, ProfileRow>()
      for (const p of (profRes.data ?? []) as ProfileRow[]) profileById.set(p.id, p)

      let successCount = 0
      let failureCount = 0
      let skippedTier  = 0
      let skippedFlag  = 0
      let emailSent    = 0
      let emailFailed  = 0

      for (const row of rows) {
        try {
          const business = businessById.get(row.business_id)
          const customer = customerById.get(row.customer_id)
          const profile  = profileById.get(row.user_id)

          if (!business) {
            await markFailure(adminAny, row.id, 'Business not found')
            failureCount++
            continue
          }
          if (!customer) {
            await markFailure(adminAny, row.id, 'Customer not found')
            failureCount++
            continue
          }

          // Pro+ gate. If the user downgraded since template creation we just
          // skip silently — surface in last_error so they can see why.
          const tier = getEffectiveTier(profile ?? {})
          if (tier === 'free') {
            await markFailure(adminAny, row.id,
              'Skipped: account dropped to Free tier. Upgrade to resume recurring invoices.')
            skippedTier++
            continue
          }

          // Per-user feature-flag check (allowlist or rollout %)
          const flagOn = await isFeatureEnabled('recurring_invoices', {
            userId: row.user_id,
            businessId: row.business_id,
          })
          if (!flagOn) {
            // Don't write last_error here — the user didn't do anything wrong;
            // they just aren't in the rollout cohort yet. Bump next_run_on
            // so we don't spin every day on the same rows.
            await bumpScheduleNoInvoice(adminAny, row, today)
            skippedFlag++
            continue
          }

          // ── Line items validation ──
          if (!Array.isArray(row.line_items) || row.line_items.length === 0) {
            await markFailure(adminAny, row.id, 'Template has no line items')
            failureCount++
            continue
          }

          // ── Increment counter + build invoice number ──
          const currentCounter = business.invoice_counter ?? 0
          const newCounter = currentCounter + 1
          const prefix = business.invoice_prefix ?? 'INV'
          const invoiceNumber = `${prefix}-${String(newCounter).padStart(4, '0')}`

          // Best-effort counter update; if the increment fails we abort
          // *before* inserting the invoice to avoid duplicate numbers.
          const { error: counterErr } = await adminAny
            .from('businesses')
            .update({ invoice_counter: newCounter })
            .eq('id', business.id)
          if (counterErr) {
            await markFailure(adminAny, row.id, `Counter update failed: ${counterErr.message}`)
            failureCount++
            continue
          }

          // ── Compute totals ──
          const totals = computeTotals(
            row.line_items as Array<{ quantity: number; unit_price: number }>,
            {
              applyVat: Boolean(row.apply_vat),
              vatRate: Number(row.vat_rate ?? 7.5),
              deliveryCharge: Number(row.delivery_charge ?? 0),
            },
          )

          // ── Compute due date ──
          const dueDays = Number.isFinite(row.due_days) ? row.due_days! : 14
          const dueDate = new Date(today)
          dueDate.setUTCDate(dueDate.getUTCDate() + (dueDays ?? 14))

          // ── Insert invoice + items ──
          const { data: inv, error: invErr } = await adminAny
            .from('invoices')
            .insert({
              business_id: business.id,
              user_id: business.user_id,
              customer_id: customer.id,
              invoice_number: invoiceNumber,
              document_type: row.document_type ?? 'invoice',
              status: 'sent',
              issue_date: todayStr,
              due_date: toDateOnly(dueDate),
              notes: row.notes ?? null,
              apply_vat: Boolean(row.apply_vat),
              vat_rate: Number(row.vat_rate ?? 7.5),
              vat_amount: totals.vatAmount,
              subtotal: totals.subtotal,
              delivery_charge: Number(row.delivery_charge ?? 0),
              total: totals.total,
            })
            .select('id')
            .single()

          if (invErr || !inv) {
            await markFailure(adminAny, row.id, `Invoice insert failed: ${invErr?.message ?? 'no row returned'}`)
            failureCount++
            continue
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const lineRows = (row.line_items as any[]).map((it) => ({
            invoice_id: (inv as { id: string }).id,
            product_id: typeof it.product_id === 'string' && it.product_id ? it.product_id : null,
            description: String(it.description ?? '').slice(0, 500),
            quantity: Number(it.quantity) || 0,
            unit_price: Number(it.unit_price) || 0,
            line_total: (Number(it.quantity) || 0) * (Number(it.unit_price) || 0),
          }))

          const { error: itemsErr } = await adminAny
            .from('invoice_items').insert(lineRows)
          if (itemsErr) {
            // Invoice exists but items failed — log loudly. We DO bump the
            // schedule so we don't retry the same broken template forever.
            await markFailure(adminAny, row.id,
              `Items insert failed (invoice ${invoiceNumber} created, no items): ${itemsErr.message}`)
            failureCount++
            // Still advance schedule so this isn't an infinite loop.
            await bumpScheduleAfterRun(adminAny, row, today, 0)
            continue
          }

          // ── Email delivery (best-effort) ──
          if (customer.email && process.env.RESEND_API_KEY) {
            try {
              const invoiceUrl = `${APP_URL}/invoice-print/${(inv as { id: string }).id}`
              const email = buildInvoiceEmail({
                customerName: customer.name,
                businessName: business.name,
                invoiceNumber,
                total: totals.total,
                invoiceUrl,
                dueDate: toDateOnly(dueDate),
              })
              await getResend().emails.send({
                from: SENDERS.noreply,
                to: customer.email,
                subject: email.subject,
                html: email.html,
              })
              emailSent++
            } catch (emailErr) {
              emailFailed++
              const msg = emailErr instanceof Error ? emailErr.message : 'unknown email error'
              console.error(`[recurring-invoices] email failed for ${invoiceNumber}:`, msg)
              // Email failure is non-fatal; the invoice still exists and is
              // visible to the customer in the dashboard. Note in last_error.
              await adminAny
                .from('recurring_invoices')
                .update({ last_error: `Email delivery failed: ${msg}` })
                .eq('id', row.id)
            }
          }

          // ── Bump schedule ──
          await bumpScheduleAfterRun(adminAny, row, today, row.generated_count + 1)
          successCount++
        } catch (err) {
          failureCount++
          const msg = err instanceof Error ? err.message : 'unknown error'
          console.error(`[recurring-invoices] row ${row.id} failed:`, msg)
          try {
            await adminAny
              .from('recurring_invoices')
              .update({ last_error: msg })
              .eq('id', row.id)
          } catch { /* swallow secondary write failure */ }
        }
      }

      return {
        processedCount: rows.length,
        successCount,
        failureCount,
        metadata: {
          skipped_tier: skippedTier,
          skipped_flag: skippedFlag,
          email_sent: emailSent,
          email_failed: emailFailed,
        },
      }
    },
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function markFailure(adminAny: any, id: string, message: string) {
  try {
    await adminAny
      .from('recurring_invoices')
      .update({ last_error: message })
      .eq('id', id)
  } catch (err) {
    console.error('[recurring-invoices] failed to write last_error:', err)
  }
}

// Advance the schedule without generating an invoice (used when the row
// was skipped for non-error reasons, e.g. flag rollout).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function bumpScheduleNoInvoice(adminAny: any, row: RecurringRow, today: Date) {
  const next = addCadence(today, row.cadence)
  const nextStr = toDateOnly(next)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: Record<string, any> = { next_run_on: nextStr }
  if (row.end_on && nextStr > row.end_on) patch.status = 'ended'
  await adminAny.from('recurring_invoices').update(patch).eq('id', row.id)
}

// Advance the schedule + record a successful generation.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function bumpScheduleAfterRun(adminAny: any, row: RecurringRow, today: Date, newCount: number) {
  const next = addCadence(today, row.cadence)
  const nextStr = toDateOnly(next)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: Record<string, any> = {
    last_run_on: toDateOnly(today),
    next_run_on: nextStr,
    generated_count: newCount,
    last_error: null, // clear any prior error on a successful run
  }
  if (row.end_on && nextStr > row.end_on) patch.status = 'ended'
  await adminAny.from('recurring_invoices').update(patch).eq('id', row.id)
}
