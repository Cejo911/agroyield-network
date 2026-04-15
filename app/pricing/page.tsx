import { createClient as createAdminClient } from '@supabase/supabase-js'
import AppNav from '@/app/components/AppNav'
import PricingClient from './pricing-client'
import { DEFAULT_PRICING } from '@/lib/tiers'

async function getPrices() {
  const adminDb = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = adminDb as any
  const { data } = await adminAny
    .from('settings')
    .select('key, value')
    .in('key', [
      'tier_pro_monthly', 'tier_pro_annual',
      'tier_growth_monthly', 'tier_growth_annual',
      'free_trial_days',
    ])

  const map: Record<string, string> = {}
  for (const row of (data ?? [])) map[row.key] = row.value

  return {
    proMonthly:    parseInt(map.tier_pro_monthly    ?? String(DEFAULT_PRICING.tier_pro_monthly), 10),
    proAnnual:     parseInt(map.tier_pro_annual     ?? String(DEFAULT_PRICING.tier_pro_annual), 10),
    growthMonthly: parseInt(map.tier_growth_monthly ?? String(DEFAULT_PRICING.tier_growth_monthly), 10),
    growthAnnual:  parseInt(map.tier_growth_annual  ?? String(DEFAULT_PRICING.tier_growth_annual), 10),
    freeTrialDays: parseInt(map.free_trial_days ?? '30', 10),
  }
}

export default async function PricingPage() {
  const prices = await getPrices()
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <PricingClient {...prices} />
    </div>
  )
}
