import { createClient as createAdminClient } from '@supabase/supabase-js'
import AppNav from '@/app/components/AppNav'
import PricingClient from './pricing-client'

async function getPrices() {
  const adminDb = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const adminAny = adminDb as any
  const { data } = await adminAny
    .from('settings')
    .select('key, value')
    .in('key', ['monthly_price', 'annual_price'])

  const map: Record<string, string> = {}
  for (const row of data ?? []) map[row.key] = row.value
  return {
    monthly: parseInt(map.monthly_price ?? '2500', 10),
    annual: parseInt(map.annual_price ?? '25000', 10),
  }
}

export default async function PricingPage() {
  const prices = await getPrices()

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />
      <PricingClient monthly={prices.monthly} annual={prices.annual} />
    </div>
  )
}
