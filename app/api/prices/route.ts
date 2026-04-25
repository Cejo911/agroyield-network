import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { createNotification } from '@/lib/notifications'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { sanitiseText } from '@/lib/sanitise'

export async function GET() {
  return NextResponse.json({ status: 'ok' })
}

export async function POST(request: NextRequest) {
  // Rate limit: 10 submissions per minute
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  const { success: allowed } = rateLimit(ip, { limit: 10, windowMs: 60_000 })
  if (!allowed) return rateLimitResponse()

  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    if (!body.commodity || !body.price || !body.unit) {
      return NextResponse.json(
        { error: 'Commodity, price and unit are required' },
        { status: 400 }
      )
    }

    const price = parseFloat(body.price)

    const { data, error } = await supabase
      .from('price_reports')
      .insert({
        user_id: user.id,
        commodity: sanitiseText(body.commodity),
        category: body.category || null,
        price,
        price_per_unit: price,
        unit: body.unit,
        market_name: sanitiseText(body.market_name),
        state: sanitiseText(body.state),
        notes: sanitiseText(body.notes),
      })
      .select('id')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // ── CHECK PRICE ALERTS ──
    // Find active alerts matching this commodity where the price crosses the threshold
    try {
      const admin = createAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      // Query all active alerts for this commodity (across all users)
      // Fetch alerts matching commodity — filter state in JS to avoid PostgREST quoting issues
      const { data: matchingAlerts, error: alertQueryErr } = await admin
        .from('price_alerts')
        .select('id, user_id, commodity, state, condition, target_price, unit')
        .eq('commodity', body.commodity)
        .eq('is_active', true)

      if (alertQueryErr) {
        console.error('Alert query error:', alertQueryErr.message)
      }

      if (matchingAlerts && matchingAlerts.length > 0) {
        // Filter by state in JS: match alerts with no state (any) or matching state
        const stateFiltered = body.state
          ? matchingAlerts.filter(a => !a.state || a.state === body.state)
          : matchingAlerts

        // Fetch poster's name for the notification
        const { data: posterProfile } = await admin
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single()
        const posterName = posterProfile
          ? [posterProfile.first_name, posterProfile.last_name].filter(Boolean).join(' ')
          : 'Someone'

        const fmt = (n: number) =>
          new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n)

        for (const alert of stateFiltered) {
          const triggered =
            (alert.condition === 'below' && price <= alert.target_price) ||
            (alert.condition === 'above' && price >= alert.target_price)

          if (triggered) {
            const direction = alert.condition === 'below' ? 'dropped to' : 'rose to'
            const stateLabel = body.state || 'Nigeria'

            await createNotification(admin, {
              userId: alert.user_id,
              type: 'price_alert',
              title: `${body.commodity} ${direction} ${fmt(price)}/${body.unit}`,
              body: `${posterName} reported a price in ${stateLabel} that hit your alert target of ${fmt(alert.target_price)}/${alert.unit}.`,
              link: '/prices',
              actorId: user.id,
              entityId: alert.id,
            })

            // Deactivate the alert so it doesn't fire repeatedly
            await admin
              .from('price_alerts')
              .update({ is_active: false })
              .eq('id', alert.id)
          }
        }
      }
    } catch (alertErr) {
      // Don't fail the price submission if alert checking fails
      console.error('Alert check error:', alertErr)
    }

    return NextResponse.json({ success: true, id: data.id })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// User self-delete of their own price report.
//
// Replaces a direct browser supabase.from('price_reports').delete() that
// was silently failing in production — same root-cause family as the
// community-post delete and the report-insert bugs. The browser update
// returned no error to the client, local state filtered the row out, and
// then a refresh re-fetched the original row from the server (page.tsx
// filters by is_active=true).
//
// Soft-delete via is_active=false rather than a hard DELETE — matches
// the rest of the platform's moderation column and keeps parity with the
// admin auto-hide path that already uses is_active. Server-side row
// stays around for audit / undelete; the public listing query already
// excludes it.
//
// Idempotent on already-deleted rows so a double-click doesn't surface
// a confusing 404 on the second attempt.
export async function DELETE(request: NextRequest) {
  // Rate limit per IP. 30/min covers reasonable cleanup bursts.
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  const { success: allowed } = rateLimit(ip, { limit: 30, windowMs: 60_000 })
  if (!allowed) return rateLimitResponse()

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as { id?: unknown }
    const id = typeof body.id === 'string' ? body.id : ''
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    // Admin client for the ownership lookup so any RLS state on
    // price_reports can't silently exclude the row from the SSR client's
    // view. The authorisation gate is the explicit user_id check below.
    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminAny = admin as any
    const { data: report, error: lookupErr } = await adminAny
      .from('price_reports')
      .select('id, user_id, is_active')
      .eq('id', id)
      .maybeSingle()
    if (lookupErr) {
      console.error('[prices DELETE] lookup failed:', lookupErr)
      return NextResponse.json(
        { error: 'Failed to verify report ownership' },
        { status: 500 },
      )
    }
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }
    if (report.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own price reports' },
        { status: 403 },
      )
    }

    // Idempotent — second click on an already-deleted row.
    if (report.is_active === false) {
      return NextResponse.json({ ok: true, id, alreadyDeleted: true })
    }

    const { error: updateErr } = await adminAny
      .from('price_reports')
      .update({ is_active: false })
      .eq('id', id)
    if (updateErr) {
      console.error('[prices DELETE] soft-delete failed:', {
        id,
        userId: user.id,
        message: updateErr.message,
        code: (updateErr as Record<string, unknown>).code,
      })
      return NextResponse.json(
        { error: updateErr.message || 'Failed to delete report' },
        { status: 500 },
      )
    }

    return NextResponse.json({ ok: true, id })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
