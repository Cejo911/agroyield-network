import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import MarketplaceClient from './marketplace-client'
import FAQAccordion from '@/app/components/FAQAccordion'
import PageShell from '@/app/components/design/PageShell'
import PageHeader from '@/app/components/design/PageHeader'
import { PrimaryLink } from '@/app/components/design/Button'
import { MODULE_FAQS } from '@/lib/faq-data'

export default async function MarketplacePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: listings } = await supabase
    .from('marketplace_listings')
    .select('id, user_id, title, category, type, price, price_negotiable, description, state, condition, image_urls, is_closed, is_featured, featured_until, created_at')
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
    <PageShell maxWidth="6xl">
      <PageHeader
        title="Marketplace"
        description="Buy, sell and trade agricultural products, inputs and equipment."
        actions={
          <div className="flex items-center gap-3">
            {/* "My Orders" is intentionally a text link (no button chrome) — */}
            {/* it's a quieter companion to the primary "Post listing" CTA.    */}
            <Link
              href="/marketplace/orders"
              className="text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
            >
              My Orders
            </Link>
            <PrimaryLink href="/marketplace/new">Post listing</PrimaryLink>
          </div>
        }
      />
      <MarketplaceClient listings={listingList} profileMap={profileMap} userId={user.id} />
      <FAQAccordion items={MODULE_FAQS.marketplace} title="Frequently Asked Questions" subtitle="Common questions about Marketplace" compact />
    </PageShell>
  )
}
