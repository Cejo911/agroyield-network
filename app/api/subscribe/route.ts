import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { plan } = await request.json() as { plan: 'monthly' | 'yearly' }
    if (!['monthly', 'yearly'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    // Read live prices from settings table
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: settingsRows } = await (adminClient as any)
      .from('settings').select('key, value')

    const s = Object.fromEntries(
      ((settingsRows ?? []) as { key: string; value: string }[]).map(r => [r.key, r.value])
    )

    const monthlyNaira = parseInt(s['subscription_monthly_naira'] ?? '2500', 10)
    const yearlyNaira  = parseInt(s['subscription_yearly_naira']  ?? '25000', 10)
    const monthlyLabel = s['subscription_monthly_label'] ?? 'Monthly Verification'
    const yearlyLabel  = s['subscription_yearly_label']  ?? 'Yearly Verification'

    const amount = (plan === 'monthly' ? monthlyNaira : yearlyNaira) * 100
    const label  =  plan === 'monthly' ? monthlyLabel  : yearlyLabel

    const origin = request.headers.get('origin') ?? 'https://agroyield.africa'

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        amount,
        callback_url: `${origin}/verify/success`,
        metadata: {
          user_id: user.id,
          plan,
          label,
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
