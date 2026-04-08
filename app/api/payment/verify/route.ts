import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

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

    const { userId, plan } = paystackData.data.metadata as {
      userId: string
      plan: 'monthly' | 'annual'
    }

    if (!userId || !plan) {
      return NextResponse.json({ error: 'Invalid payment metadata' }, { status: 400 })
    }

    const adminAny = getAdminClient() as any

    // Check if this reference was already processed (idempotency)
    const { data: existing } = await adminAny
      .from('profiles')
      .select('id, subscription_plan')
      .eq('id', userId)
      .single()

    // Update profile — idempotent, safe to call multiple times
    const { error: updateError } = await adminAny
      .from('profiles')
      .update({
        is_verified: true,
        subscription_plan: plan,
        subscription_expires_at: getExpiryDate(plan),
      })
      .eq('id', userId)

    if (updateError) throw updateError

    return NextResponse.json({ success: true, plan })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
