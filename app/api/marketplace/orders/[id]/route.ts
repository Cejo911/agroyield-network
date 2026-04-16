import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { slackAlert } from '@/lib/slack'
import { createNotification } from '@/lib/notifications'
import { logAdminAction } from '@/lib/admin/audit-log'

const AUTO_RELEASE_DAYS = 7

/**
 * GET   /api/marketplace/orders/[id] — order detail (buyer or seller only)
 * PATCH /api/marketplace/orders/[id] — update order status (ship, confirm, cancel, admin actions)
 */

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()

  const { data: order } = await admin
    .from('marketplace_orders')
    .select('*, marketplace_listings(title, image_urls, category, type, state)')
    .eq('id', id)
    .single()

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // Only buyer, seller, or admin can view
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const isAdmin = (profile as { role: string } | null)?.role === 'admin'

  if (order.buyer_id !== user.id && order.seller_id !== user.id && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch dispute if any
  const { data: dispute } = await admin
    .from('marketplace_disputes')
    .select('*')
    .eq('order_id', id)
    .single()

  // Fetch buyer & seller names
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, first_name, last_name, username, email')
    .in('id', [order.buyer_id, order.seller_id])

  const profilesMap: Record<string, { first_name: string; last_name: string; username: string; email: string }> = {}
  for (const p of (profiles ?? []) as { id: string; first_name: string; last_name: string; username: string; email: string }[]) {
    profilesMap[p.id] = p
  }

  return NextResponse.json({ order, dispute, profiles: profilesMap, isAdmin })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
    const { success } = rateLimit(ip, { limit: 10, windowMs: 60_000 })
    if (!success) return rateLimitResponse()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getSupabaseAdmin()
    const body = await request.json() as { action: string }

    // Fetch current order
    const { data: order } = await admin
      .from('marketplace_orders')
      .select('*, marketplace_listings(title)')
      .eq('id', id)
      .single()

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check admin status
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    const isAdmin = (profile as { role: string } | null)?.role === 'admin'
    const isBuyer = order.buyer_id === user.id
    const isSeller = order.seller_id === user.id
    const listingTitle = (order.marketplace_listings as { title: string } | null)?.title ?? 'a listing'

    switch (body.action) {
      // ── Seller marks as shipped ───────────────────────────────────
      case 'ship': {
        if (!isSeller) return NextResponse.json({ error: 'Only the seller can mark as shipped' }, { status: 403 })
        if (order.status !== 'paid') return NextResponse.json({ error: 'Order must be in "paid" status' }, { status: 400 })

        const deadline = new Date()
        deadline.setDate(deadline.getDate() + AUTO_RELEASE_DAYS)

        await admin.from('marketplace_orders').update({
          status: 'shipped',
          shipped_at: new Date().toISOString(),
          delivery_deadline: deadline.toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', id)

        // Notify buyer
        createNotification(admin, {
          userId: order.buyer_id,
          type: 'system',
          title: 'Order shipped',
          body: `Your order for "${listingTitle}" has been shipped. Please confirm delivery within ${AUTO_RELEASE_DAYS} days.`,
          link: `/marketplace/orders/${id}`,
          actorId: order.seller_id,
          entityId: id,
        })

        slackAlert({
          title: 'Order Shipped',
          level: 'info',
          fields: { 'Order': id, 'Listing': listingTitle, 'Auto-release': deadline.toISOString() },
        }).catch(() => {})

        return NextResponse.json({ status: 'shipped', delivery_deadline: deadline.toISOString() })
      }

      // ── Buyer confirms delivery → release funds ───────────────────
      case 'confirm': {
        if (!isBuyer) return NextResponse.json({ error: 'Only the buyer can confirm delivery' }, { status: 403 })
        if (order.status !== 'shipped') return NextResponse.json({ error: 'Order must be in "shipped" status' }, { status: 400 })

        // Release funds via Paystack Transfer
        const releaseResult = await releaseFunds(admin, order, id)
        if (!releaseResult.ok) {
          return NextResponse.json({ error: releaseResult.error }, { status: 500 })
        }

        return NextResponse.json({ status: 'completed' })
      }

      // ── Buyer or seller cancels (only before shipping) ────────────
      case 'cancel': {
        if (!isBuyer && !isSeller) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        if (!['pending_payment', 'paid'].includes(order.status)) {
          return NextResponse.json({ error: 'Cannot cancel after shipping' }, { status: 400 })
        }

        // If already paid, initiate refund
        if (order.status === 'paid' && order.paystack_reference) {
          await initiateRefund(order.paystack_reference)
        }

        await admin.from('marketplace_orders').update({
          status: 'cancelled',
          payment_status: order.status === 'paid' ? 'refunded' : order.payment_status,
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', id)

        // Notify the other party
        const otherUserId = isBuyer ? order.seller_id : order.buyer_id
        createNotification(admin, {
          userId: otherUserId,
          type: 'system',
          title: 'Order cancelled',
          body: `The order for "${listingTitle}" has been cancelled.`,
          link: `/marketplace/orders/${id}`,
          actorId: user.id,
          entityId: id,
        })

        slackAlert({
          title: 'Order Cancelled',
          level: 'warning',
          fields: { 'Order': id, 'Listing': listingTitle, 'By': isBuyer ? 'Buyer' : 'Seller' },
        }).catch(() => {})

        return NextResponse.json({ status: 'cancelled' })
      }

      // ── Admin: force release funds ────────────────────────────────
      case 'admin_release': {
        if (!isAdmin) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
        if (!['shipped', 'disputed'].includes(order.status)) {
          return NextResponse.json({ error: 'Order must be shipped or disputed' }, { status: 400 })
        }

        const releaseResult = await releaseFunds(admin, order, id)
        if (!releaseResult.ok) {
          return NextResponse.json({ error: releaseResult.error }, { status: 500 })
        }

        logAdminAction({
          adminId: user.id,
          action: 'marketplace_order_release',
          targetType: 'marketplace_order',
          targetId: id,
          details: { amount: order.seller_amount },
        })

        return NextResponse.json({ status: 'completed' })
      }

      // ── Admin: refund buyer ───────────────────────────────────────
      case 'admin_refund': {
        if (!isAdmin) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
        if (!['paid', 'shipped', 'disputed'].includes(order.status)) {
          return NextResponse.json({ error: 'Cannot refund this order' }, { status: 400 })
        }

        if (order.paystack_reference) {
          await initiateRefund(order.paystack_reference)
        }

        await admin.from('marketplace_orders').update({
          status: 'refunded',
          payment_status: 'refunded',
          updated_at: new Date().toISOString(),
        }).eq('id', id)

        // Notify both parties
        createNotification(admin, {
          userId: order.buyer_id,
          type: 'system',
          title: 'Order refunded',
          body: `Your payment for "${listingTitle}" has been refunded by the admin.`,
          link: `/marketplace/orders/${id}`,
          entityId: id,
        })
        createNotification(admin, {
          userId: order.seller_id,
          type: 'system',
          title: 'Order refunded',
          body: `The order for "${listingTitle}" has been refunded to the buyer by the admin.`,
          link: `/marketplace/orders/${id}`,
          entityId: id,
        })

        logAdminAction({
          adminId: user.id,
          action: 'marketplace_order_refund',
          targetType: 'marketplace_order',
          targetId: id,
          details: { amount: order.amount },
        })

        slackAlert({
          title: 'Order Refunded (Admin)',
          level: 'warning',
          fields: { 'Order': id, 'Amount': `₦${order.amount.toLocaleString()}` },
        }).catch(() => {})

        return NextResponse.json({ status: 'refunded' })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    console.error('Order update error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ── Helper: Release funds to seller via Paystack Transfer ─────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function releaseFunds(admin: any, order: any, orderId: string) {
  // Fetch seller's recipient code
  const { data: sellerBank } = await admin
    .from('seller_bank_accounts')
    .select('recipient_code')
    .eq('user_id', order.seller_id)
    .single()

  if (!sellerBank?.recipient_code) {
    return { ok: false, error: 'Seller has no payout account configured' }
  }

  // Initiate Paystack Transfer
  const transferRes = await fetch('https://api.paystack.co/transfer', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: 'balance',
      amount: Math.round(order.seller_amount * 100), // kobo
      recipient: sellerBank.recipient_code,
      reason: `AgroYield order ${orderId}`,
      currency: 'NGN',
    }),
  })

  const transferData = await transferRes.json()

  if (!transferData.status) {
    console.error('Paystack transfer failed:', transferData.message)
    return { ok: false, error: transferData.message ?? 'Transfer failed' }
  }

  const transferCode = transferData.data.transfer_code as string

  // Update order to completed
  await admin.from('marketplace_orders').update({
    status: 'completed',
    payment_status: 'released',
    confirmed_at: new Date().toISOString(),
    released_at: new Date().toISOString(),
    transfer_code: transferCode,
    updated_at: new Date().toISOString(),
  }).eq('id', orderId)

  const listingTitle = order.marketplace_listings?.title ?? 'a listing'

  // Notify seller
  createNotification(admin, {
    userId: order.seller_id,
    type: 'system',
    title: 'Payment released',
    body: `₦${order.seller_amount.toLocaleString()} has been sent to your bank for "${listingTitle}"`,
    link: `/marketplace/orders/${orderId}`,
    entityId: orderId,
  })

  // Notify buyer
  createNotification(admin, {
    userId: order.buyer_id,
    type: 'system',
    title: 'Order completed',
    body: `Your order for "${listingTitle}" is now complete.`,
    link: `/marketplace/orders/${orderId}`,
    entityId: orderId,
  })

  slackAlert({
    title: 'Funds Released to Seller',
    level: 'info',
    fields: {
      'Order': orderId,
      'Listing': listingTitle,
      'Seller amount': `₦${order.seller_amount.toLocaleString()}`,
      'Transfer': transferCode,
    },
  }).catch(() => {})

  return { ok: true }
}

// ── Helper: Refund buyer via Paystack ─────────────────────────────────
async function initiateRefund(reference: string) {
  try {
    const res = await fetch('https://api.paystack.co/refund', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transaction: reference }),
    })
    const data = await res.json()
    if (!data.status) {
      console.error('Paystack refund failed:', data.message)
    }
  } catch (err) {
    console.error('Refund error:', err)
  }
}
