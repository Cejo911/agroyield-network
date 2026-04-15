import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AppNav from '@/app/components/AppNav'
import MarketplaceClient from './marketplace-client'
import FAQAccordion from '@/app/components/FAQAccordion'
import { MODULE_FAQS } from '@/lib/faq-data'

export default async function MarketplacePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: listings } = await supabase
    .from('marketplace_listings')
    .select('id, user_id, title, category, type, price, price_negotiable, description, state, condition, image_urls, is_closed, created_at')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  const listingList = (listings ?? []) as any[]
  const userIds = [...new Set(listingList.map((l: any) => l.user_id))]

  const { data: profiles } = userIds.length > 0
    ? await supabase.from('profiles').select('id, first_name, last_name, avatar_url, username').in('id', userIds)
    : { data: [] }

  const profileMap: Record<string, any> = {}
  for (const p of (profiles ?? []) as any[]) profileMap[p.id] = p

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Marketplace</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Buy, sell and trade agricultural products, inputs and equipment.
            </p>
          </div>
          <Link
            href="/marketplace/new"
            className="bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
          >
            Post listing
          </Link>
        </div>
        <MarketplaceClient listings={listingList} profileMap={profileMap} userId={user.id} />
        <FAQAccordion items={MODULE_FAQS.marketplace} title="Frequently Asked Questions" subtitle="Common questions about Marketplace" compact />
      </main>
    </div>
  )
}
