import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { slackAlert } from '@/lib/slack'

// Default pricing — overridden by settings table
const DEFAULT_FEATURED_PLANS = [
  { days: 7,  price: 500,  label: '7 days' },
  { days: 14, price: 900,  label: '14 days' },
  { days: 30, price: 1500, label: '30 days' },
]

/**
 * GET  /api/marketplace/feature — get featured listing plans (from settings)
 * POST /api/marketplace/feature — initiate payment to feature a listing
 */

export async function GET() {
  const admin = getSupabaseAdmin()
  const plans = await getFeaturedPlans(admin)
  return NextResponse.json({ plans })
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
    const { success } = rateLimit(ip, { limit: 5, windowMs: 60_000 })
    if (!success) return rateLimitResponse()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json() as { listing_id: string; days: number }
    const { listing_id, days } = body
    if (!listing_id || !days) {
      return NextResponse.json({ error: 'listing_id and days are required' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()

    // Verify listing exists and belongs to user
    const { data: listing } = await admin
      .from('marketplace_listings')
      .select('id, user_id, title, is_active, is_closed')
      .eq('id', listing_id)
      .single()

    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    if (listing.user_id !== user.id) return NextResponse.json({ error: 'You can only feature your own listings' }, { status: 403 })
    if (!listing.is_active || listing.is_closed) return NextResponse.json({ error: 'Listing must be active and open' }, { status: 400 })

    // Look up price from settings
    const plans = await getFeaturedPlans(admin)
    const plan = plans.find(p => p.days === days)
    if (!plan) return NextResponse.json({ error: 'Invalid duration' }, { status: 400 })

    // Get user email
    const { data: profile } = await admin.from('profiles').select('email').eq('id', user.id).single()
    const email = (profile as { email: string } | null)?.email ?? user.email!

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://agroyield.africa'

    // Initialize Paystack transaction
    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: plan.price * 100, // kobo
        currency: 'NGN',
        callback_url: `${baseUrl}/marketplace/${listing_id}?featured=success`,
        metadata: {
          type: 'featured_listing',
          listing_id,
          user_id: user.id,
          days: plan.days,
          listing_title: listing.title,
        },
      }),
    })

    const paystackData = await paystackRes.json()
    if (!paystackData.status) {
      throw new Error(paystackData.message ?? 'Paystack initialization failed')
    }

    const reference = paystackData.data.reference as string

    // Record payment (pending)
    await admin.from('featured_listing_payments').insert({
      listing_id,
      user_id: user.id,
      amount: plan.price,
      days: plan.days,
      paystack_reference: reference,
      status: 'pending',
    })

    slackAlert({
      title: 'Featured Listing Payment Initiated',
      level: 'info',
      fields: {
        'Listing': listing.title,
        'Duration': `${plan.days} days`,
        'Amount': `₦${plan.price.toLocaleString()}`,
        'User': email,
      },
    }).catch(() => {})

    return NextResponse.json({
      authorization_url: paystackData.data.authorization_url,
      reference,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    console.error('Feature listing error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ── Helper: read featured plans from settings, with defaults ──────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getFeaturedPlans(admin: any) {
  const { data: setting } = await admin
    .from('settings')
    .select('value')
    .eq('key', 'featured_listing_plans')
    .single()

  if (setting?.value) {
    try {
      const parsed = JSON.parse(setting.value)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as { days: number; price: number; label: string }[]
    } catch { /* fall through to defaults */ }
  }

  return DEFAULT_FEATURED_PLANS
}
