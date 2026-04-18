import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { getEffectiveTier } from '@/lib/tiers'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { sanitiseText } from '@/lib/sanitise'

/**
 * Recurring Invoices API (Unicorn #4).
 *
 * - POST   create a template + cadence. Pro+ only, gated by the
 *          `recurring_invoices` feature flag (allows staged rollout).
 * - PATCH  pause / resume / end / edit-template. Either the template
 *          owner or the business owner can mutate. We compute the new
 *          `next_run_on` server-side when cadence, start_on, or status
 *          changes — the client never sets next_run_on directly.
 * - DELETE soft-end only (sets status='ended'). Hard deletes would
 *          stay GDPR-safe anyway but we keep the row for audit.
 *
 * Writes go through the service-role admin client so we can return
 * friendlier errors than RLS's opaque 403; the base auth + ownership
 * checks in this route are the security gate (defence-in-depth with RLS,
 * same pattern as business_reviews — see scratchpad #42).
 */

const CADENCES = ['weekly', 'monthly', 'quarterly'] as const
type Cadence = typeof CADENCES[number]

const ACTIONS = ['pause', 'resume', 'end'] as const
type Action = typeof ACTIONS[number]

interface LineItemInput {
  product_id?: string | null
  description: string
  quantity: number
  unit_price: number
}

// Maximum active templates per business — prevents runaway wallet-drain
// if a user scripts 500 recurring invoices. 50 is generous; we can lift
// later if a real user hits it.
const MAX_ACTIVE_PER_BUSINESS = 50

function computeNextRun(from: Date, cadence: Cadence): Date {
  const d = new Date(from)
  switch (cadence) {
    case 'weekly':
      d.setUTCDate(d.getUTCDate() + 7)
      break
    case 'monthly':
      d.setUTCMonth(d.getUTCMonth() + 1)
      break
    case 'quarterly':
      d.setUTCMonth(d.getUTCMonth() + 3)
      break
  }
  return d
}

function toDateOnly(d: Date): string {
  // YYYY-MM-DD (UTC). Postgres `date` handles the rest.
  return d.toISOString().slice(0, 10)
}

function parseDateOnly(s: string | null | undefined): Date | null {
  if (!s) return null
  // Treat bare dates as UTC midnight to avoid TZ drift.
  const parsed = new Date(`${s}T00:00:00Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function sanitiseLineItems(raw: unknown): LineItemInput[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null
  const out: LineItemInput[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null
    const r = item as Record<string, unknown>
    const description = sanitiseText(typeof r.description === 'string' ? r.description : null)
    const quantity = Number(r.quantity)
    const unitPrice = Number(r.unit_price)
    if (!description) return null
    if (!Number.isFinite(quantity) || quantity <= 0) return null
    if (!Number.isFinite(unitPrice) || unitPrice < 0) return null
    const productId = typeof r.product_id === 'string' && r.product_id ? r.product_id : null
    out.push({
      product_id: productId,
      description,
      quantity,
      unit_price: unitPrice,
    })
  }
  return out
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
  const limit = rateLimit(`rec-inv:${ip}`, { limit: 10, windowMs: 60_000 })
  if (!limit.success) return rateLimitResponse()

  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supa = supabase as any

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json() as {
      businessId?: string
      customerId?: string
      cadence?: string
      documentType?: string
      notes?: string | null
      applyVat?: boolean
      vatRate?: number
      deliveryCharge?: number
      dueDays?: number
      lineItems?: unknown
      startOn?: string | null  // optional; defaults to today
      endOn?: string | null    // optional; null = open-ended
    }

    if (!body.businessId || typeof body.businessId !== 'string') {
      return NextResponse.json({ error: 'businessId required' }, { status: 400 })
    }
    if (!body.customerId || typeof body.customerId !== 'string') {
      return NextResponse.json({ error: 'customerId required' }, { status: 400 })
    }
    if (!CADENCES.includes(body.cadence as Cadence)) {
      return NextResponse.json({ error: 'Invalid cadence' }, { status: 400 })
    }
    const lineItems = sanitiseLineItems(body.lineItems)
    if (!lineItems) {
      return NextResponse.json({ error: 'lineItems must be a non-empty array of valid items' }, { status: 400 })
    }

    // Pro+ gate. Free tier can't create recurring invoices.
    const { data: profile } = await supa
      .from('profiles')
      .select('subscription_tier, subscription_expires_at')
      .eq('id', user.id)
      .single()
    const tier = getEffectiveTier((profile as Record<string, unknown> | null) ?? {})
    if (tier === 'free') {
      return NextResponse.json({
        error: 'Recurring invoices are a Pro+ feature',
        upgradeToTier: 'pro',
      }, { status: 402 })
    }

    // Business ownership check (defence-in-depth with RLS).
    const { data: business } = await supa
      .from('businesses')
      .select('id, user_id')
      .eq('id', body.businessId)
      .single()
    if (!business || (business as { user_id: string }).user_id !== user.id) {
      return NextResponse.json({ error: 'Business not found or not yours' }, { status: 403 })
    }

    // Feature flag check — allows percentage rollout or allowlist before
    // the flag is globally enabled.
    const flagOn = await isFeatureEnabled('recurring_invoices', {
      userId: user.id,
      businessId: body.businessId,
    })
    if (!flagOn) {
      return NextResponse.json({
        error: 'Recurring invoices aren\'t available for your account yet',
      }, { status: 403 })
    }

    // Enforce per-business cap on active templates.
    const { count: activeCount } = await supa
      .from('recurring_invoices')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', body.businessId)
      .eq('status', 'active')
    if (typeof activeCount === 'number' && activeCount >= MAX_ACTIVE_PER_BUSINESS) {
      return NextResponse.json({
        error: `Max ${MAX_ACTIVE_PER_BUSINESS} active recurring invoices per business`,
      }, { status: 409 })
    }

    const startOn = parseDateOnly(body.startOn) ?? new Date()
    const endOn = parseDateOnly(body.endOn ?? null)
    if (endOn && endOn < startOn) {
      return NextResponse.json({ error: 'end_on must be on or after start_on' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminAny = admin as any

    const { data: inserted, error: insertErr } = await adminAny
      .from('recurring_invoices')
      .insert({
        business_id: body.businessId,
        user_id: user.id,
        customer_id: body.customerId,
        cadence: body.cadence,
        document_type: body.documentType ?? 'invoice',
        notes: sanitiseText(body.notes ?? null),
        apply_vat: Boolean(body.applyVat),
        vat_rate: Number.isFinite(body.vatRate) ? body.vatRate : 7.5,
        delivery_charge: Number.isFinite(body.deliveryCharge) ? body.deliveryCharge : 0,
        due_days: Number.isFinite(body.dueDays) ? body.dueDays : 14,
        line_items: lineItems,
        start_on: toDateOnly(startOn),
        next_run_on: toDateOnly(startOn), // first run = start date
        end_on: endOn ? toDateOnly(endOn) : null,
        status: 'active',
      })
      .select()
      .single()

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, recurringInvoice: inserted })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supa = supabase as any

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json() as {
      id?: string
      action?: Action
      // optional template edits (passed independently of action):
      cadence?: string
      notes?: string | null
      applyVat?: boolean
      vatRate?: number
      deliveryCharge?: number
      dueDays?: number
      lineItems?: unknown
      endOn?: string | null
    }
    if (!body.id || typeof body.id !== 'string') {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    // Load row + business ownership in one shot so we can authorise.
    const { data: row } = await supa
      .from('recurring_invoices')
      .select('id, business_id, user_id, cadence, start_on, next_run_on, status')
      .eq('id', body.id)
      .single()
    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const r = row as {
      id: string; business_id: string; user_id: string;
      cadence: Cadence; start_on: string; next_run_on: string; status: string
    }

    // Either the template owner or the business owner can mutate.
    let authorised = r.user_id === user.id
    if (!authorised) {
      const { data: biz } = await supa
        .from('businesses')
        .select('user_id').eq('id', r.business_id).single()
      authorised = Boolean(biz && (biz as { user_id: string }).user_id === user.id)
    }
    if (!authorised) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patch: Record<string, any> = {}

    // --- Action handling (status + next_run_on recompute) ---
    if (body.action) {
      if (!ACTIONS.includes(body.action)) {
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
      }
      if (body.action === 'pause') {
        if (r.status === 'ended') {
          return NextResponse.json({ error: 'Cannot pause an ended schedule' }, { status: 400 })
        }
        patch.status = 'paused'
      } else if (body.action === 'resume') {
        if (r.status === 'ended') {
          return NextResponse.json({ error: 'Cannot resume an ended schedule' }, { status: 400 })
        }
        patch.status = 'active'
        // If next_run_on is in the past (because it was paused for a while),
        // bump it to today so the cron doesn't try to generate back-dated
        // invoices on the very next tick. (No, we don't backfill — that
        // would confuse customers.)
        const today = toDateOnly(new Date())
        if (r.next_run_on < today) {
          patch.next_run_on = today
        }
      } else if (body.action === 'end') {
        patch.status = 'ended'
      }
    }

    // --- Template edits (allowed in any status except after end) ---
    if (body.cadence !== undefined) {
      if (!CADENCES.includes(body.cadence as Cadence)) {
        return NextResponse.json({ error: 'Invalid cadence' }, { status: 400 })
      }
      patch.cadence = body.cadence
    }
    if (body.notes !== undefined) patch.notes = sanitiseText(body.notes)
    if (typeof body.applyVat === 'boolean') patch.apply_vat = body.applyVat
    if (Number.isFinite(body.vatRate)) patch.vat_rate = body.vatRate
    if (Number.isFinite(body.deliveryCharge)) patch.delivery_charge = body.deliveryCharge
    if (Number.isFinite(body.dueDays)) patch.due_days = body.dueDays
    if (body.lineItems !== undefined) {
      const items = sanitiseLineItems(body.lineItems)
      if (!items) {
        return NextResponse.json({ error: 'lineItems must be a non-empty array' }, { status: 400 })
      }
      patch.line_items = items
    }
    if (body.endOn !== undefined) {
      const endOn = parseDateOnly(body.endOn)
      patch.end_on = endOn ? toDateOnly(endOn) : null
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminAny = admin as any
    const { error: updErr } = await adminAny
      .from('recurring_invoices')
      .update(patch)
      .eq('id', body.id)

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  // Soft-end: we keep the row for audit. Hard delete isn't exposed.
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supa = supabase as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { data: row } = await supa
      .from('recurring_invoices')
      .select('id, business_id, user_id')
      .eq('id', id)
      .single()
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const r = row as { id: string; business_id: string; user_id: string }

    let authorised = r.user_id === user.id
    if (!authorised) {
      const { data: biz } = await supa
        .from('businesses').select('user_id').eq('id', r.business_id).single()
      authorised = Boolean(biz && (biz as { user_id: string }).user_id === user.id)
    }
    if (!authorised) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const admin = getSupabaseAdmin()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminAny = admin as any
    const { error: updErr } = await adminAny
      .from('recurring_invoices')
      .update({ status: 'ended' })
      .eq('id', id)
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
