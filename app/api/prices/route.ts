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
