import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PLANS = {
  monthly: { amount: 250000, label: 'Monthly Verification' },
  yearly:  { amount: 2500000, label: 'Yearly Verification' },
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { plan } = await request.json() as { plan: 'monthly' | 'yearly' }
    if (!PLANS[plan]) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

    const origin = request.headers.get('origin') ?? 'https://agroyield.africa'

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        amount: PLANS[plan].amount,
        callback_url: `${origin}/verify/success`,
        metadata: {
          user_id: user.id,
          plan,
          cancel_action: `${origin}/verify`,
        },
      }),
    })

    const data = await response.json() as { status: boolean; data: { authorization_url: string } }
    if (!data.status) throw new Error('Failed to initialize payment')

    return NextResponse.json({ url: data.data.authorization_url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
