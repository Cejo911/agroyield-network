import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { slackAlert } from '@/lib/slack'
import { createNotification } from '@/lib/notifications'

/**
 * GET /api/marketplace/orders/auto-release
 *
 * Cron job — auto-releases escrow funds for shipped orders whose
 * delivery_deadline has passed without buyer confirmation or dispute.
 *
 * Called daily by Vercel Cron (vercel.json). Uses same CRON_SECRET
 * auth pattern as other cron routes.
 */

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sends Authorization: Bearer <CRON_SECRET>)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()

  // Find shipped orders past their delivery deadline
  const { data: orders, error } = await admin
    .from('marketplace_orders')
    .select('id, buyer_id, seller_id, seller_amount, paystack_reference, marketplace_listings(title)')
    .eq('status', 'shipped')
    .not('delivery_deadline', 'is', null)
    .lte('delivery_deadline', new Date().toISOString())

  if (error) {
    console.error('Auto-release query error:', error.message)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  if (!orders || orders.length === 0) {
    return NextResponse.json({ released: 0, message: 'No orders to auto-release' })
  }

  let released = 0
  const failures: string[] = []

  for (const order of orders) {
    try {
      // Get seller's Paystack recipient
      const { data: sellerBank } = await admin
        .from('seller_bank_accounts')
        .select('recipient_code')
        .eq('user_id', order.seller_id)
        .single()

      if (!sellerBank?.recipient_code) {
        failures.push(`${order.id}: no recipient code`)
        continue
      }

      // Initiate Paystack transfer
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
          reason: `AgroYield auto-release — order ${order.id}`,
          currency: 'NGN',
        }),
      })
      const transferData = await transferRes.json()

      if (!transferData.status) {
        failures.push(`${order.id}: ${transferData.message}`)
        continue
      }

      // Update order
      await admin.from('marketplace_orders').update({
        status: 'completed',
        payment_status: 'released',
        confirmed_at: new Date().toISOString(),
        released_at: new Date().toISOString(),
        transfer_code: transferData.data.transfer_code,
        updated_at: new Date().toISOString(),
      }).eq('id', order.id)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const listingTitle = (order.marketplace_listings as any)?.title ?? 'a listing'

      // Notify both parties
      createNotification(admin, {
        userId: order.seller_id,
        type: 'system',
        title: 'Payment auto-released',
        body: `₦${Number(order.seller_amount).toLocaleString()} for "${listingTitle}" has been automatically released to your bank.`,
        link: `/marketplace/orders/${order.id}`,
        entityId: order.id,
      })
      createNotification(admin, {
        userId: order.buyer_id,
        type: 'system',
        title: 'Order auto-completed',
        body: `Your order for "${listingTitle}" has been automatically completed after the confirmation window expired.`,
        link: `/marketplace/orders/${order.id}`,
        entityId: order.id,
      })

      released++
    } catch (err) {
      failures.push(`${order.id}: ${err instanceof Error ? err.message : 'unknown error'}`)
    }
  }

  // Slack summary
  slackAlert({
    title: 'Escrow Auto-Release Complete',
    level: failures.length > 0 ? 'warning' : 'info',
    fields: {
      'Released': released,
      'Failed': failures.length,
      ...(failures.length > 0 ? { 'Failures': failures.join('; ') } : {}),
    },
  }).catch(() => {})

  return NextResponse.json({ released, failed: failures.length, failures })
}
