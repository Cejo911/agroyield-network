import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { DEFAULT_PRICING, DEFAULT_FREE_TRIAL_DAYS } from '@/lib/tiers'
import type { TierName } from '@/lib/tiers'

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
    const { success } = rateLimit(ip, { limit: 5, windowMs: 60_000 })
    if (!success) return rateLimitResponse()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as {
      tier: TierName
      billing: 'monthly' | 'annual'
    }

    const { tier, billing } = body

    // Validate inputs
    if (!['pro', 'growth'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
    }
    if (!['monthly', 'annual'].includes(billing)) {
      return NextResponse.json({ error: 'Invalid billing cycle' }, { status: 400 })
    }

    const adminDb = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminAny = adminDb as any

    // Check if user is eligible for free trial
    // Free trial: user has never had a paid subscription before
    const { data: profile } = await adminAny
      .from('profiles')
      .select('email, first_name, last_name, subscription_tier, subscription_expires_at')
      .eq('id', user.id)
      .single()

    const raw = profile as Record<string, unknown> | null
    const email = (raw?.email as string) ?? user.email!
    const hasPreviousSubscription = raw?.subscription_tier && raw.subscription_tier !== 'free'

    // Read free trial days setting
    const { data: trialSetting } = await adminAny
      .from('settings').select('value').eq('key', 'free_trial_days').single()
    const trialDays = parseInt((trialSetting as Record<string, unknown>)?.value as string ?? String(DEFAULT_FREE_TRIAL_DAYS), 10)

    // If eligible for free trial, activate immediately without payment
    if (!hasPreviousSubscription && trialDays > 0) {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + trialDays)

      await adminAny
        .from('profiles')
        .update({
          subscription_tier: tier,
          subscription_plan: 'trial',
          subscription_expires_at: expiresAt.toISOString(),
          is_verified: true,
        })
        .eq('id', user.id)

      return NextResponse.json({
        trial: true,
        tier,
        expires_at: expiresAt.toISOString(),
        days: trialDays,
      })
    }

    // Read tier price from settings
    const priceKey = `tier_${tier}_${billing}`
    const { data: priceSetting } = await adminAny
      .from('settings').select('value').eq('key', priceKey).single()

    const price = parseInt(
      (priceSetting as Record<string, unknown>)?.value as string
        ?? String(DEFAULT_PRICING[priceKey] ?? 2000),
      10
    )

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
        amount: price * 100, // Paystack expects kobo
        currency: 'NGN',
        callback_url: `${baseUrl}/subscribe/success`,
        metadata: {
          userId: user.id,
          tier,
          billing,
          // Keep legacy 'plan' field for backward compat with webhook
          plan: billing,
          cancel_action: `${baseUrl}/pricing`,
        },
      }),
    })

    const paystackData = await paystackRes.json()

    if (!paystackData.status) {
      throw new Error(paystackData.message ?? 'Paystack initialization failed')
    }

    return NextResponse.json({
      authorization_url: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
