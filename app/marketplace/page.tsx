import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import MarketplaceClient from './marketplace-client'
import FAQAccordion from '@/app/components/FAQAccordion'
import PageShell from '@/app/components/design/PageShell'
import PageHeader from '@/app/components/design/PageHeader'
import { PrimaryLink } from '@/app/components/design/Button'
import { MODULE_FAQS } from '@/lib/faq-data'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

type ProfileRow = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'id' | 'first_name' | 'last_name' | 'avatar_url' | 'username'
>

// Listing shape mirrors the marketplace-client `Listing` type, which assumes
// non-null user_id and created_at — those columns are nullable at the DB level
// but in practice are always populated for active listings.
type Listing = {
  id: string
  user_id: string
  title: string
  category: string | null
  type: string | null
  price: number | null
  price_negotiable: boolean | null
  description: string | null
  state: string | null
  condition: string | null
  image_urls: string[] | null
  is_closed: boolean
  is_featured: boolean | null
  featured_until: string | null
  created_at: string
}

export default async function MarketplacePage() {
  const supabase = (await createClient()) as SupabaseClient<Database>
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: listings }, { data: savedRows }] = await Promise.all([
    supabase
      .from('marketplace_listings')
      .select('id, user_id, title, category, type, price, price_negotiable, description, state, condition, image_urls, is_closed, is_featured, featured_until, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('saves')
      .select('content_id')
      .eq('user_id', user.id)
      .eq('content_type', 'marketplace_listing'),
  ])

  const savedIds: string[] = (savedRows ?? []).map((r) => r.content_id)

  const listingList: Listing[] = (listings ?? [])
    .filter((l) => l.user_id !== null && l.created_at !== null)
    .map((l) => ({ ...l, user_id: l.user_id as string, created_at: l.created_at as string }))
  const userIds = [...new Set(listingList.map((l) => l.user_id))]

  const { data: profiles } = userIds.length > 0
    ? await supabase.from('profiles').select('id, first_name, last_name, avatar_url, username').in('id', userIds)
    : { data: [] as ProfileRow[] }

  const profileMap: Record<string, ProfileRow> = {}
  for (const p of (profiles ?? []) as ProfileRow[]) profileMap[p.id] = p

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
      <MarketplaceClient listings={listingList} profileMap={profileMap} userId={user.id} savedIds={savedIds} />
      <FAQAccordion items={MODULE_FAQS.marketplace} title="Frequently Asked Questions" subtitle="Common questions about Marketplace" compact />
    </PageShell>
  )
}
