import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { slackAlert } from '@/lib/slack'
import { createNotification } from '@/lib/notifications'

const COMMISSION_RATE = 0.03 // 3% platform fee

/**
 * GET  /api/marketplace/orders — list current user's orders (as buyer or seller)
 * POST /api/marketplace/orders — create order + initialize Paystack payment
 */

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = request.nextUrl.searchParams.get('role') ?? 'all' // 'buyer' | 'seller' | 'all'
  const admin = getSupabaseAdmin()

  let query = admin
    .from('marketplace_orders')
    .select('*, marketplace_listings(title, image_urls, category)')
    .order('created_at', { ascending: false })

  if (role === 'buyer') {
    query = query.eq('buyer_id', user.id)
  } else if (role === 'seller') {
    query = query.eq('seller_id', user.id)
  } else {
    query = query.or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
  }

  const { data, error } = await query
  if (error) {
    console.error('Orders fetch error:', error.message)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }

  return NextResponse.json({ orders: data ?? [] })
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
    const { success } = rateLimit(ip, { limit: 5, windowMs: 60_000 })
    if (!success) return rateLimitResponse()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { listing_id } = await request.json() as { listing_id: string }
    if (!listing_id) {
      return NextResponse.json({ error: 'listing_id is required' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()

    // Fetch listing details
    const { data: listing } = await admin
      .from('marketplace_listings')
      .select('id, user_id, title, price, is_closed, is_active, type')
      .eq('id', listing_id)
      .single()

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }
    if (listing.is_closed || !listing.is_active) {
      return NextResponse.json({ error: 'This listing is no longer available' }, { status: 400 })
    }
    if (listing.type !== 'sell') {
      return NextResponse.json({ error: 'Only "sell" listings can be purchased' }, { status: 400 })
    }
    if (!listing.price || listing.price <= 0) {
      return NextResponse.json({ error: 'Listing has no valid price' }, { status: 400 })
    }
    if (listing.user_id === user.id) {
      return NextResponse.json({ error: 'You cannot buy your own listing' }, { status: 400 })
    }

    // Check seller has bank account set up (needed for eventual payout)
    const { data: sellerBank } = await admin
      .from('seller_bank_accounts')
      .select('recipient_code')
      .eq('user_id', listing.user_id)
      .single()

    if (!sellerBank?.recipient_code) {
      return NextResponse.json(
        { error: 'Seller has not set up their payout account yet. Please contact them.' },
        { status: 400 }
      )
    }

    // Check for existing pending order on same listing by same buyer
    const { data: existing } = await admin
      .from('marketplace_orders')
      .select('id')
      .eq('listing_id', listing_id)
      .eq('buyer_id', user.id)
      .in('status', ['pending_payment', 'paid', 'shipped'])
      .limit(1)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'You already have an active order for this listing' },
        { status: 400 }
      )
    }

    // Calculate amounts
    const amount = Number(listing.price)
    const commission = Math.round(amount * COMMISSION_RATE)
    const sellerAmount = amount - commission

    // Get buyer email for Paystack
    const { data: profile } = await admin
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single()
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
        amount: amount * 100, // kobo
        currency: 'NGN',
        callback_url: `${baseUrl}/marketplace/orders?payment=success`,
        metadata: {
          type: 'marketplace_order',
          listing_id: listing.id,
          buyer_id: user.id,
          seller_id: listing.user_id,
          listing_title: listing.title,
        },
      }),
    })

    const paystackData = await paystackRes.json()
    if (!paystackData.status) {
      throw new Error(paystackData.message ?? 'Paystack initialization failed')
    }

    const reference = paystackData.data.reference as string

    // Create order record
    const { data: order, error: orderError } = await admin
      .from('marketplace_orders')
      .insert({
        listing_id: listing.id,
        buyer_id: user.id,
        seller_id: listing.user_id,
        amount,
        commission,
        seller_amount: sellerAmount,
        paystack_reference: reference,
        payment_status: 'pending',
        status: 'pending_payment',
      })
      .select('id')
      .single()

    if (orderError) {
      console.error('Order creation failed:', orderError.message)
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    // Notify seller that someone is about to pay for their listing
    createNotification(admin, {
      userId: listing.user_id,
      type: 'system',
      title: 'New order incoming',
      body: `A buyer has initiated payment for "${listing.title}"`,
      link: `/marketplace/orders/${order.id}`,
      actorId: user.id,
      entityId: order.id,
    })

    // Slack alert
    slackAlert({
      title: 'Marketplace Order Created',
      level: 'info',
      fields: {
        'Order': order.id,
        'Listing': listing.title,
        'Amount': `₦${amount.toLocaleString()}`,
        'Commission': `₦${commission.toLocaleString()} (3%)`,
        'Buyer': email,
      },
    }).catch(() => {})

    return NextResponse.json({
      order_id: order.id,
      authorization_url: paystackData.data.authorization_url,
      reference,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    console.error('Order creation error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
