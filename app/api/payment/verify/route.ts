import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function getExpiryDate(billing: string): string {
  const date = new Date()
  if (billing === 'annual') {
    date.setFullYear(date.getFullYear() + 1)
  } else {
    date.setMonth(date.getMonth() + 1)
  }
  return date.toISOString()
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reference = searchParams.get('reference')

    if (!reference) {
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 })
    }

    // Verify with Paystack
    const paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    )

    const paystackData = await paystackRes.json()

    if (!paystackData.status || paystackData.data?.status !== 'success') {
      return NextResponse.json({ error: 'Payment not successful' }, { status: 400 })
    }

    const metadata = paystackData.data.metadata as Record<string, string>
    const userId = metadata?.userId
    const tier = metadata?.tier ?? 'pro' // Default to pro for legacy payments
    const billing = metadata?.billing ?? metadata?.plan ?? 'monthly'

    if (!userId) {
      return NextResponse.json({ error: 'Invalid payment metadata' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminAny = getAdminClient() as any

    // Update profile with tier and billing info
    const { error: updateError } = await adminAny
      .from('profiles')
      .update({
        is_verified: true,
        subscription_tier: tier,
        subscription_plan: billing,
        subscription_expires_at: getExpiryDate(billing),
      })
      .eq('id', userId)

    if (updateError) throw updateError

    return NextResponse.json({ success: true, tier, billing })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
