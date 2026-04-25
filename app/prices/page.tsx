import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PricesClient from './prices-client'
import PriceIntelligence from './price-intelligence'
import FAQAccordion from '@/app/components/FAQAccordion'
import { MODULE_FAQS } from '@/lib/faq-data'
import PageShell from '@/app/components/design/PageShell'
import PageHeader from '@/app/components/design/PageHeader'
import { PrimaryLink } from '@/app/components/design/Button'
import PricesTabs from './prices-tabs'
import { getSettings } from '@/lib/settings'

export default async function PricesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch all active reports.
  //
  // is_active=true filter is REQUIRED. price_reports.is_active is the
  // platform's moderation column for both user self-delete (DELETE
  // /api/prices flips it to false) and admin "Hide price" actions
  // (PATCH /api/admin/prices with action='hide' or 'delete'). Before
  // this filter existed the listing showed every row regardless of
  // moderation state, so soft-deleted rows reappeared on refresh and
  // the admin hide action was silently no-op'd.
  const { data: rawReports } = await supabase
    .from('price_reports')
    .select('id, user_id, commodity, category, price, unit, market_name, state, reported_at')
    .eq('is_active', true)
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
    <PageShell maxWidth="6xl">
      <PageHeader
        title="Price Tracker"
        description="Live commodity prices reported by members across Nigeria."
        actions={<PrimaryLink href="/prices/submit">Report a price</PrimaryLink>}
      />
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
    </PageShell>
  )
}
