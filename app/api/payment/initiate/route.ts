import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

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

    const { plan } = await request.json() as { plan: 'monthly' | 'annual' }
    if (!['monthly', 'annual'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    // Read price from settings
    const adminDb = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const adminAny = adminDb as any

    const key = plan === 'monthly' ? 'monthly_price' : 'annual_price'
    const { data: priceSetting } = await adminAny
      .from('settings').select('value').eq('key', key).single()

    const price = parseInt(
      (priceSetting as Record<string, unknown>)?.value as string
        ?? (plan === 'monthly' ? '2500' : '25000'),
      10
    )

    // Fetch user email from profiles
    const { data: profile } = await adminAny
      .from('profiles').select('email, first_name, last_name').eq('id', user.id).single()

    const email = (profile as Record<string, unknown>)?.email as string ?? user.email!
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
          plan,
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
