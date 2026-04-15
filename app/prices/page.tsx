import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PricesClient from './prices-client'
import PriceIntelligence from './price-intelligence'
import FAQAccordion from '@/app/components/FAQAccordion'
import { MODULE_FAQS } from '@/lib/faq-data'
import AppNav from '@/app/components/AppNav'
import PricesTabs from './prices-tabs'
import { getSettings } from '@/lib/settings'

export default async function PricesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch all reports
  const { data: rawReports } = await supabase
    .from('price_reports')
    .select('id, user_id, commodity, category, price, unit, market_name, state, reported_at')
    .order('reported_at', { ascending: false })
    .limit(500)

  // Fetch profiles for all unique report authors
  const uniqueUserIds = [...new Set((rawReports ?? []).map(r => r.user_id))]
  const { data: profiles } = uniqueUserIds.length > 0
    ? await supabase
        .from('profiles')
        .select('id, first_name, last_name, username, avatar_url')
        .in('id', uniqueUserIds)
    : { data: [] }

  // Merge profiles into reports
  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))
  const reports = (rawReports ?? []).map(r => ({
    ...r,
    profiles: profileMap.get(r.user_id) || null,
  }))

  // Fetch commodity categories from admin settings
  const settings = await getSettings(['commodity_categories'])
  let categories: string[] = ['Grains', 'Tubers', 'Legumes', 'Vegetables', 'Fruits', 'Livestock', 'Cash Crops']
  try {
    if (settings.commodity_categories) categories = JSON.parse(settings.commodity_categories)
  } catch { /* use defaults */ }

  // Fetch user's price alerts
  const { data: alerts } = await supabase
    .from('price_alerts')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Price Tracker</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Live commodity prices reported by members across Nigeria.
            </p>
          </div>
          <Link href="/prices/submit" className="bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors">
            Report a price
          </Link>
        </div>
        <PricesTabs
          reportsTab={<PricesClient reports={reports} userId={user.id} categories={categories} />}
          intelligenceTab={
            <PriceIntelligence
              reports={reports as any}
              alerts={(alerts ?? []) as any}
              userId={user.id}
            />
          }
        />
        <FAQAccordion items={MODULE_FAQS.prices} title="Frequently Asked Questions" subtitle="Common questions about Price Tracker" compact />
      </main>
    </div>
  )
}
