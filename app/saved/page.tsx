import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import PageShell from '@/app/components/design/PageShell'
import PageHeader from '@/app/components/design/PageHeader'
import BookmarkButton from '@/app/components/design/BookmarkButton'

// The /saved page is the cross-module bookmark hub — a single place to review
// everything a user has marked as interesting across Opportunities, Grants, and
// Marketplace. It intentionally doesn't try to be a full feed; each section
// links through to the detail page so interaction (Apply / Message / etc) still
// happens in the module surface that owns the domain logic.

type SavedRow = {
  content_type: 'opportunity' | 'grant' | 'marketplace_listing'
  content_id: string
  created_at: string
}

type OpportunityLite = {
  id: string
  title: string
  type: string | null
  organisation: string | null
  location: string | null
  deadline: string | null
  is_closed: boolean | null
  thumbnail_url: string | null
}

type GrantLite = {
  id: string
  title: string
  funder: string
  status: string
  category: string | null
  deadline: string | null
  thumbnail_url: string | null
}

type ListingLite = {
  id: string
  title: string
  price: number | null
  type: string | null
  category: string | null
  state: string | null
  is_closed: boolean | null
  image_urls: string[] | null
}

const formatDate = (dateStr: string | null) =>
  dateStr
    ? new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

const formatPrice = (price: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(price)

export default async function SavedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any

  const { data: savedRaw } = await supabaseAny
    .from('saves')
    .select('content_type, content_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const saves: SavedRow[] = (savedRaw ?? []) as SavedRow[]

  // Bucket ids by content_type so we can fetch each domain table with a single
  // IN-query rather than N round-trips.
  const oppIds  = saves.filter(s => s.content_type === 'opportunity').map(s => s.content_id)
  const grantIds = saves.filter(s => s.content_type === 'grant').map(s => s.content_id)
  const listIds = saves.filter(s => s.content_type === 'marketplace_listing').map(s => s.content_id)

  const [oppsRes, grantsRes, listingsRes] = await Promise.all([
    oppIds.length > 0
      ? supabase
          .from('opportunities')
          .select('id, title, type, organisation, location, deadline, is_closed, thumbnail_url')
          .in('id', oppIds)
      : Promise.resolve({ data: [] }),
    grantIds.length > 0
      ? supabaseAny
          .from('grants')
          .select('id, title, funder, status, category, deadline, thumbnail_url')
          .in('id', grantIds)
      : Promise.resolve({ data: [] }),
    listIds.length > 0
      ? supabase
          .from('marketplace_listings')
          .select('id, title, price, type, category, state, is_closed, image_urls')
          .in('id', listIds)
      : Promise.resolve({ data: [] }),
  ])

  // Index by id so we can re-sort the domain rows in the same order the user
  // saved them (newest first). Without this re-map, the Supabase IN() ordering
  // is effectively arbitrary.
  const oppMap   = new Map<string, OpportunityLite>()
  for (const o of (oppsRes.data ?? []) as OpportunityLite[]) oppMap.set(o.id, o)
  const grantMap = new Map<string, GrantLite>()
  for (const g of (grantsRes.data ?? []) as GrantLite[]) grantMap.set(g.id, g)
  const listMap  = new Map<string, ListingLite>()
  for (const l of (listingsRes.data ?? []) as ListingLite[]) listMap.set(l.id, l)

  const savedOpps     = oppIds.map(id => oppMap.get(id)).filter(Boolean) as OpportunityLite[]
  const savedGrants   = grantIds.map(id => grantMap.get(id)).filter(Boolean) as GrantLite[]
  const savedListings = listIds.map(id => listMap.get(id)).filter(Boolean) as ListingLite[]

  const totalCount = savedOpps.length + savedGrants.length + savedListings.length

  return (
    <PageShell maxWidth="4xl">
      <PageHeader
        title="Saved"
        description="Opportunities, grants, and marketplace listings you've bookmarked."
      />

      {totalCount === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center">
          <p className="text-4xl mb-3">🔖</p>
          <p className="font-semibold text-gray-900 dark:text-white">You haven&apos;t saved anything yet</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto">
            Tap the bookmark on any opportunity, grant, or marketplace listing to collect it here for later.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm">
            <Link href="/opportunities" className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium">Browse opportunities</Link>
            <span className="text-gray-300 dark:text-gray-700">·</span>
            <Link href="/grants" className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium">Browse grants</Link>
            <span className="text-gray-300 dark:text-gray-700">·</span>
            <Link href="/marketplace" className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium">Browse marketplace</Link>
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Opportunities */}
          {savedOpps.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Opportunities <span className="text-sm font-normal text-gray-400 dark:text-gray-500">({savedOpps.length})</span>
                </h2>
                <Link href="/opportunities" className="text-xs text-green-600 dark:text-green-400 hover:underline">Browse all</Link>
              </div>
              <div className="space-y-3">
                {savedOpps.map(opp => {
                  const deadline = formatDate(opp.deadline)
                  const isClosed = opp.is_closed ?? false
                  return (
                    <div key={opp.id} className={`relative bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 ${isClosed ? 'opacity-70' : ''}`}>
                      <div className="absolute top-4 right-4 z-10">
                        <BookmarkButton
                          contentType="opportunity"
                          contentId={opp.id}
                          initiallySaved={true}
                          stopPropagation
                        />
                      </div>
                      <Link href={`/opportunities/${opp.id}`} className="block p-5 pr-14">
                        <div className="flex items-start gap-4">
                          {opp.thumbnail_url && (
                            <Image src={opp.thumbnail_url} alt="" width={64} height={64} className="rounded-lg object-cover shrink-0 border border-gray-100 dark:border-gray-800" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              {opp.type && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                                  {opp.type}
                                </span>
                              )}
                              {isClosed && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                                  CLOSED
                                </span>
                              )}
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">{opp.title}</h3>
                            {opp.organisation && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{opp.organisation}</p>
                            )}
                            <div className="flex flex-wrap gap-3 text-xs text-gray-400 dark:text-gray-500 mt-2">
                              {opp.location && <span>📍 {opp.location}</span>}
                              {deadline && <span>⏰ {deadline}</span>}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Grants */}
          {savedGrants.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Grants <span className="text-sm font-normal text-gray-400 dark:text-gray-500">({savedGrants.length})</span>
                </h2>
                <Link href="/grants" className="text-xs text-green-600 dark:text-green-400 hover:underline">Browse all</Link>
              </div>
              <div className="space-y-3">
                {savedGrants.map(g => {
                  const deadline = formatDate(g.deadline)
                  return (
                    <div key={g.id} className="relative bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                      <div className="absolute top-4 right-4 z-10">
                        <BookmarkButton
                          contentType="grant"
                          contentId={g.id}
                          initiallySaved={true}
                          stopPropagation
                        />
                      </div>
                      <Link href={`/grants/${g.id}`} className="block p-5 pr-14">
                        <div className="flex items-start gap-4">
                          {g.thumbnail_url && (
                            <Image src={g.thumbnail_url} alt="" width={64} height={64} className="rounded-lg object-cover shrink-0 border border-gray-100 dark:border-gray-800" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                g.status === 'open'     ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                                g.status === 'upcoming' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'     :
                                                          'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                              }`}>
                                {g.status.charAt(0).toUpperCase() + g.status.slice(1)}
                              </span>
                              {g.category && (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                  {g.category}
                                </span>
                              )}
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">{g.title}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{g.funder}</p>
                            {deadline && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">⏰ {deadline}</p>
                            )}
                          </div>
                        </div>
                      </Link>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Marketplace */}
          {savedListings.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Marketplace <span className="text-sm font-normal text-gray-400 dark:text-gray-500">({savedListings.length})</span>
                </h2>
                <Link href="/marketplace" className="text-xs text-green-600 dark:text-green-400 hover:underline">Browse all</Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {savedListings.map(l => {
                  const cover = l.image_urls?.[0]
                  const isClosed = l.is_closed ?? false
                  return (
                    <div key={l.id} className={`relative bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden ${isClosed ? 'opacity-70' : ''}`}>
                      <div className="absolute top-3 right-3 z-10">
                        <BookmarkButton
                          contentType="marketplace_listing"
                          contentId={l.id}
                          initiallySaved={true}
                          stopPropagation
                        />
                      </div>
                      <Link href={`/marketplace/${l.id}`} className="block">
                        {cover && (
                          <div className="relative w-full aspect-[4/3] bg-gray-100 dark:bg-gray-800">
                            <Image src={cover} alt={l.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 336px" />
                          </div>
                        )}
                        <div className="p-4 pr-12">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            {l.type && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 capitalize">
                                {l.type}
                              </span>
                            )}
                            {l.category && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 capitalize">
                                {l.category}
                              </span>
                            )}
                            {isClosed && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                                CLOSED
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2">{l.title}</h3>
                          {l.price !== null && (
                            <p className="text-sm font-bold text-green-700 dark:text-green-400 mt-1.5">{formatPrice(l.price)}</p>
                          )}
                          {l.state && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">📍 {l.state}</p>
                          )}
                        </div>
                      </Link>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </PageShell>
  )
}
