import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { sanitiseText } from '@/lib/sanitise'
import { slackAlert } from '@/lib/slack'
import { createNotification } from '@/lib/notifications'
import { logAdminAction } from '@/lib/admin/audit-log'

/**
 * POST  /api/marketplace/orders/[id]/dispute — raise a dispute (buyer or seller)
 * PATCH /api/marketplace/orders/[id]/dispute — admin resolve dispute
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
    const { success } = rateLimit(ip, { limit: 3, windowMs: 60_000 })
    if (!success) return rateLimitResponse()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getSupabaseAdmin()

    // Verify order exists and user is participant
    const { data: order } = await admin
      .from('marketplace_orders')
      .select('id, buyer_id, seller_id, status, marketplace_listings(title)')
      .eq('id', orderId)
      .single()

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.buyer_id !== user.id && order.seller_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!['paid', 'shipped'].includes(order.status)) {
      return NextResponse.json({ error: 'Disputes can only be raised on paid or shipped orders' }, { status: 400 })
    }

    // Check no existing dispute
    const { data: existing } = await admin
      .from('marketplace_disputes')
      .select('id')
      .eq('order_id', orderId)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'A dispute already exists for this order' }, { status: 400 })
    }

    const body = await request.json() as { reason: string; description?: string }
    const reason = sanitiseText(body.reason)
    if (!reason) return NextResponse.json({ error: 'Reason is required' }, { status: 400 })

    // Create dispute
    const { data: dispute, error } = await admin
      .from('marketplace_disputes')
      .insert({
        order_id: orderId,
        raised_by: user.id,
        reason,
        description: sanitiseText(body.description) ?? null,
        status: 'open',
      })
      .select('id')
      .single()

    if (error) {
      console.error('Dispute creation failed:', error.message)
      return NextResponse.json({ error: 'Failed to create dispute' }, { status: 500 })
    }

    // Update order status
    await admin.from('marketplace_orders').update({
      status: 'disputed',
      updated_at: new Date().toISOString(),
    }).eq('id', orderId)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listingTitle = (order.marketplace_listings as any)?.title ?? 'a listing'
    const otherUserId = user.id === order.buyer_id ? order.seller_id : order.buyer_id

    // Notify other party
    createNotification(admin, {
      userId: otherUserId,
      type: 'system',
      title: 'Dispute raised',
      body: `A dispute has been raised on your order for "${listingTitle}": ${reason}`,
      link: `/marketplace/orders/${orderId}`,
      actorId: user.id,
      entityId: orderId,
    })

    // Slack alert for admins
    slackAlert({
      title: 'Marketplace Dispute Raised',
      level: 'error',
      fields: {
        'Order': orderId,
        'Listing': listingTitle,
        'Raised by': user.id === order.buyer_id ? 'Buyer' : 'Seller',
        'Reason': reason,
      },
    }).catch(() => {})

    return NextResponse.json({ dispute_id: dispute.id, status: 'open' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    console.error('Dispute error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getSupabaseAdmin()

    // Admin only
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if ((profile as { role: string } | null)?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const body = await request.json() as {
      resolution: string       // 'resolved_seller' | 'resolved_buyer'
      notes?: string
    }

    if (!['resolved_seller', 'resolved_buyer'].includes(body.resolution)) {
      return NextResponse.json({ error: 'Resolution must be resolved_seller or resolved_buyer' }, { status: 400 })
    }

    // Update dispute
    await admin.from('marketplace_disputes').update({
      status: body.resolution,
      resolution: sanitiseText(body.notes) ?? null,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    }).eq('order_id', orderId)

    // If resolved in seller's favour → release funds
    // If resolved in buyer's favour → refund
    const { data: order } = await admin
      .from('marketplace_orders')
      .select('*, marketplace_listings(title)')
      .eq('id', orderId)
      .single()

    if (order) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const listingTitle = (order.marketplace_listings as any)?.title ?? 'a listing'

      if (body.resolution === 'resolved_seller') {
        // Release funds to seller
        const { data: sellerBank } = await admin
          .from('seller_bank_accounts')
          .select('recipient_code')
          .eq('user_id', order.seller_id)
          .single()

        if (sellerBank?.recipient_code) {
          const transferRes = await fetch('https://api.paystack.co/transfer', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              source: 'balance',
              amount: Math.round(order.seller_amount * 100),
              recipient: sellerBank.recipient_code,
              reason: `AgroYield dispute resolution — order ${orderId}`,
              currency: 'NGN',
            }),
          })
          const transferData = await transferRes.json()

          await admin.from('marketplace_orders').update({
            status: 'completed',
            payment_status: 'released',
            released_at: new Date().toISOString(),
            transfer_code: transferData.data?.transfer_code ?? null,
            updated_at: new Date().toISOString(),
          }).eq('id', orderId)
        }

        createNotification(admin, {
          userId: order.seller_id,
          type: 'system',
          title: 'Dispute resolved in your favour',
          body: `Funds for "${listingTitle}" will be released to your account.`,
          link: `/marketplace/orders/${orderId}`,
          entityId: orderId,
        })
        createNotification(admin, {
          userId: order.buyer_id,
          type: 'system',
          title: 'Dispute resolved',
          body: `The dispute for "${listingTitle}" has been resolved in the seller's favour.`,
          link: `/marketplace/orders/${orderId}`,
          entityId: orderId,
        })
      } else {
        // Refund buyer
        if (order.paystack_reference) {
          try {
            await fetch('https://api.paystack.co/refund', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ transaction: order.paystack_reference }),
            })
          } catch (err) {
            console.error('Refund error:', err)
          }
        }

        await admin.from('marketplace_orders').update({
          status: 'refunded',
          payment_status: 'refunded',
          updated_at: new Date().toISOString(),
        }).eq('id', orderId)

        createNotification(admin, {
          userId: order.buyer_id,
          type: 'system',
          title: 'Dispute resolved in your favour',
          body: `Your payment for "${listingTitle}" will be refunded.`,
          link: `/marketplace/orders/${orderId}`,
          entityId: orderId,
        })
        createNotification(admin, {
          userId: order.seller_id,
          type: 'system',
          title: 'Dispute resolved',
          body: `The dispute for "${listingTitle}" has been resolved in the buyer's favour. Payment refunded.`,
          link: `/marketplace/orders/${orderId}`,
          entityId: orderId,
        })
      }

      logAdminAction({
        adminId: user.id,
        action: 'marketplace_dispute_resolved',
        targetType: 'marketplace_dispute',
        targetId: orderId,
        details: { resolution: body.resolution, notes: body.notes },
      })

      slackAlert({
        title: 'Dispute Resolved',
        level: 'info',
        fields: {
          'Order': orderId,
          'Resolution': body.resolution,
          'Listing': listingTitle,
        },
      }).catch(() => {})
    }

    return NextResponse.json({ status: body.resolution })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    console.error('Dispute resolution error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
