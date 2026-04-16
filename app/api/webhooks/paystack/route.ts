import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { slackAlert } from '@/lib/slack'
import { createNotification } from '@/lib/notifications'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-paystack-signature') ?? ''

    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
      .update(rawBody)
      .digest('hex')

    if (hash !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const event = JSON.parse(rawBody) as { event: string; data: Record<string, any> }

    if (event.event === 'charge.success' && event.data.status === 'success') {
      const metadata = event.data.metadata ?? {}
      const admin = getSupabaseAdmin()

      // ── Marketplace order payment ─────────────────────────────────
      if (metadata.type === 'marketplace_order') {
        await handleMarketplacePayment(admin, event.data)
        return NextResponse.json({ received: true })
      }

      // ── Subscription payment (existing logic) ─────────────────────
      const { user_id, tier, billing, plan } = metadata

      // Determine tier: new metadata takes precedence over legacy
      const effectiveTier = tier || 'pro'

      // Determine duration from billing or legacy plan field
      const isAnnual = billing === 'annual' || plan === 'yearly'
      const expiresAt = new Date()
      if (isAnnual) {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1)
      } else {
        expiresAt.setMonth(expiresAt.getMonth() + 1)
      }

      await admin.from('profiles').update({
        subscription_tier: effectiveTier,
        is_verified: true,
        verified_at: new Date().toISOString(),
        subscription_plan: billing || plan || 'monthly',
        subscription_expires_at: expiresAt.toISOString(),
      }).eq('id', user_id)
    }

    return NextResponse.json({ received: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    console.error('Webhook error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Handle a successful marketplace payment.
 * Updates order status from pending_payment → paid and notifies the seller.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleMarketplacePayment(admin: any, data: Record<string, any>) {
  const reference = data.reference as string
  const metadata = data.metadata

  // Find the order by Paystack reference
  const { data: order, error } = await admin
    .from('marketplace_orders')
    .select('id, buyer_id, seller_id, amount, status, marketplace_listings(title)')
    .eq('paystack_reference', reference)
    .single()

  if (error || !order) {
    console.error('Marketplace webhook: order not found for reference', reference)
    return
  }

  // Only process if still pending
  if (order.status !== 'pending_payment') {
    console.log('Marketplace webhook: order already processed', order.id)
    return
  }

  // Update order to paid
  await admin.from('marketplace_orders').update({
    status: 'paid',
    payment_status: 'paid',
    updated_at: new Date().toISOString(),
  }).eq('id', order.id)

  const listingTitle = order.marketplace_listings?.title ?? metadata?.listing_title ?? 'a listing'

  // Notify seller — they can now ship
  createNotification(admin, {
    userId: order.seller_id,
    type: 'system',
    title: 'Payment received — ship now',
    body: `Buyer has paid ₦${Number(order.amount).toLocaleString()} for "${listingTitle}". Please ship and mark as shipped.`,
    link: `/marketplace/orders/${order.id}`,
    actorId: order.buyer_id,
    entityId: order.id,
  })

  // Notify buyer — payment confirmed
  createNotification(admin, {
    userId: order.buyer_id,
    type: 'system',
    title: 'Payment confirmed',
    body: `Your payment for "${listingTitle}" is confirmed. The seller will ship soon.`,
    link: `/marketplace/orders/${order.id}`,
    entityId: order.id,
  })

  slackAlert({
    title: 'Marketplace Payment Confirmed',
    level: 'info',
    fields: {
      'Order': order.id,
      'Listing': listingTitle,
      'Amount': `₦${Number(order.amount).toLocaleString()}`,
      'Reference': reference,
    },
  }).catch(() => {})
}
