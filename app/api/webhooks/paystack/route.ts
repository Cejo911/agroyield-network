import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-paystack-signature') ?? ''

    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
      .update(rawBody)
      .digest('hex')

    if (hash !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = JSON.parse(rawBody) as {
      event: string
      data: {
        status: string
        metadata: {
          user_id: string
          tier?: 'pro' | 'growth'
          billing?: 'monthly' | 'annual'
          plan?: 'monthly' | 'yearly' // Legacy field
        }
      }
    }

    if (event.event === 'charge.success' && event.data.status === 'success') {
      const { user_id, tier, billing, plan } = event.data.metadata

      // Determine tier: new metadata takes precedence over legacy
      const effectiveTier = tier || 'pro'

      // Determine duration from billing or legacy plan field
      const isAnnual = billing === 'annual' || plan === 'yearly'
      const expiresAt = new Date()
      if (isAnnual) {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1)
      } else {
        expiresAt.setMonth(expiresAt.getMonth() + 1)
      }

      const adminClient = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient as any).from('profiles').update({
        subscription_tier: effectiveTier,
        is_verified: true,
        verified_at: new Date().toISOString(),
        subscription_plan: billing || plan || 'monthly',
        subscription_expires_at: expiresAt.toISOString(),
      }).eq('id', user_id)
    }

    return NextResponse.json({ received: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
