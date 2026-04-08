import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import crypto from 'crypto'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function getExpiryDate(plan: string): string {
  const date = new Date()
  if (plan === 'annual') {
    date.setFullYear(date.getFullYear() + 1)
  } else {
    date.setMonth(date.getMonth() + 1)
  }
  return date.toISOString()
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-paystack-signature')

    // Verify webhook signature
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
      .update(rawBody)
      .digest('hex')

    if (hash !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = JSON.parse(rawBody)

    // Only handle successful charges
    if (event.event !== 'charge.success') {
      return NextResponse.json({ received: true })
    }

    const { metadata, status } = event.data

    if (status !== 'success') {
      return NextResponse.json({ received: true })
    }

    const userId = metadata?.userId as string | undefined
    const plan   = metadata?.plan   as 'monthly' | 'annual' | undefined

    if (!userId || !plan) {
      console.error('[webhook] Missing userId or plan in metadata', metadata)
      return NextResponse.json({ received: true })
    }

    const adminAny = getAdminClient() as any

    const { error } = await adminAny
      .from('profiles')
      .update({
        is_verified: true,
        subscription_plan: plan,
        subscription_expires_at: getExpiryDate(plan),
      })
      .eq('id', userId)

    if (error) {
      console.error('[webhook] Profile update failed:', error)
    } else {
      console.log(`[webhook] Verified user ${userId} on ${plan} plan`)
    }

    return NextResponse.json({ received: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    console.error('[webhook] Error:', message)
    // Always return 200 to Paystack so it doesn't retry
    return NextResponse.json({ received: true })
  }
}
