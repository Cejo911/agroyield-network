import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getEffectiveTier, checkTierLimit } from '@/lib/tiers'

/**
 * POST /api/tier/check
 * Body: { action: 'create_invoice' | 'create_business' | 'invite_team', businessId?: string }
 * Returns: { allowed, tier, reason?, limit?, usage?, upgradeToTier? }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { action, businessId } = await request.json() as {
      action: 'create_invoice' | 'create_business' | 'invite_team'
      businessId?: string
    }

    if (!action) {
      return NextResponse.json({ error: 'Missing action' }, { status: 400 })
    }

    const adminDb = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminAny = adminDb as any

    // Get user's tier
    const { data: profile } = await adminAny
      .from('profiles')
      .select('subscription_tier, subscription_expires_at')
      .eq('id', user.id)
      .single()

    const tier = getEffectiveTier(profile as { subscription_tier?: string; subscription_expires_at?: string } ?? {})

    let currentCount = 0

    switch (action) {
      case 'create_invoice': {
        if (!businessId) {
          return NextResponse.json({ error: 'Missing businessId' }, { status: 400 })
        }
        // Count invoices created this month for this business
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)
        const { count } = await adminAny
          .from('invoices')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', businessId)
          .gte('created_at', startOfMonth.toISOString())
        currentCount = count ?? 0
        break
      }
      case 'create_business': {
        // Count businesses owned by user
        const { count } = await adminAny
          .from('businesses')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
        currentCount = count ?? 0
        break
      }
      case 'invite_team': {
        if (!businessId) {
          return NextResponse.json({ error: 'Missing businessId' }, { status: 400 })
        }
        // Count active team members for this business
        const { count } = await adminAny
          .from('business_team')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', businessId)
        currentCount = count ?? 0
        break
      }
    }

    const result = checkTierLimit(tier, action, currentCount)

    return NextResponse.json({
      ...result,
      tier,
      usage: currentCount,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
