import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import PageShell from '@/app/components/design/PageShell'
import PageHeader from '@/app/components/design/PageHeader'
import SearchForm from './search-form'
import { globalSearch, countResults } from '@/lib/global-search'
import type {
  SearchProfile,
  SearchOpportunity,
  SearchGrant,
  SearchMarketplaceListing,
  SearchBusiness,
} from '@/lib/global-search'

// ---------------------------------------------------------------------------
// /search — global site-wide results page.
//
// URL params:
//   ?q=...       — the query (min 2 chars).
//   ?tab=...     — which bucket to scroll to (profiles|opportunities|grants|
//                  marketplace|businesses|all). Defaults to `all`.
//
// Auth: authenticated only (matches the rest of the app's searchable
// surfaces). Redirects to /login?next=/search?q=... if the visitor is signed
// out.
//
// Rendering: one server round-trip → `globalSearch` runs 5 parallel ILIKE
// queries (all trigram-indexed) → we render a sticky tab bar + one section
// per surface. Empty buckets collapse to a subtle "No results" line so the
// visual rhythm stays consistent regardless of the query.
// ---------------------------------------------------------------------------

const BUCKET_LIMIT = 20   // Per-surface rows shown on /search. Over-fetch
                          // relative to the nav-bar dropdown's 5 so power
                          // users get a richer picture.

export const metadata: Metadata = {
  title: 'Search — AgroYield Network',
  description: 'Find people, opportunities, grants, listings, and businesses across AgroYield Network.',
  robots: { index: false, follow: false },
}

type SearchParams = Record<string, string | string[] | undefined>

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const qRaw = typeof params.q === 'string' ? params.q : ''
  const q    = qRaw.trim().slice(0, 100)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(`/search?q=${encodeURIComponent(q)}`)}`)

  // Only run the query if there's something to search for.
  const results = q.length >= 2
    ? await globalSearch(supabase, q, BUCKET_LIMIT)
    : { profiles: [], opportunities: [], grants: [], marketplace_listings: [], businesses: [] }
  const counts = countResults(results)

  return (
    <PageShell maxWidth="4xl">
      <PageHeader
        title="Search"
        description={
          q.length < 2
            ? 'Find people, opportunities, grants, listings, and businesses.'
            : `${counts.total} result${counts.total === 1 ? '' : 's'} for "${q}"`
        }
      />

      <div className="mb-6">
        <SearchForm initialQuery={q} />
      </div>

      {q.length < 2 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-10 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Type at least 2 characters to search.
          </p>
        </div>
      ) : counts.total === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-10 text-center">
          <p className="text-gray-900 dark:text-white font-semibold">No matches found</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Try a different keyword or check your spelling.
          </p>
        </div>
      ) : (
        <>
          {/* Tab bar — counts double as anchor pills. Each links to the section
              below via hash fragment. On mobile, horizontal scroll keeps the
              bar one-line without forcing tiny hit targets. */}
          <div className="sticky top-0 z-10 -mx-4 px-4 pb-3 pt-2 bg-gray-50 dark:bg-gray-950 overflow-x-auto mb-6">
            <div className="inline-flex gap-2">
              {counts.profiles > 0 && (
                <TabPill href="#profiles" label="People" count={counts.profiles} />
              )}
              {counts.opportunities > 0 && (
                <TabPill href="#opportunities" label="Opportunities" count={counts.opportunities} />
              )}
              {counts.grants > 0 && (
                <TabPill href="#grants" label="Grants" count={counts.grants} />
              )}
              {counts.marketplace_listings > 0 && (
                <TabPill href="#marketplace" label="Marketplace" count={counts.marketplace_listings} />
              )}
              {counts.businesses > 0 && (
                <TabPill href="#businesses" label="Businesses" count={counts.businesses} />
              )}
            </div>
          </div>

          <div className="space-y-6">
            {counts.profiles > 0 && (
              <Section id="profiles" title="People" count={counts.profiles}>
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {results.profiles.map(p => (
                    <li key={p.id}><ProfileRow profile={p} /></li>
                  ))}
                </ul>
              </Section>
            )}

            {counts.opportunities > 0 && (
              <Section id="opportunities" title="Opportunities" count={counts.opportunities}>
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {results.opportunities.map(o => (
                    <li key={o.id}><OpportunityRow opportunity={o} /></li>
                  ))}
                </ul>
              </Section>
            )}

            {counts.grants > 0 && (
              <Section id="grants" title="Grants" count={counts.grants}>
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {results.grants.map(g => (
                    <li key={g.id}><GrantRow grant={g} /></li>
                  ))}
                </ul>
              </Section>
            )}

            {counts.marketplace_listings > 0 && (
              <Section id="marketplace" title="Marketplace" count={counts.marketplace_listings}>
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {results.marketplace_listings.map(m => (
                    <li key={m.id}><MarketplaceRow listing={m} /></li>
                  ))}
                </ul>
              </Section>
            )}

            {counts.businesses > 0 && (
              <Section id="businesses" title="Businesses" count={counts.businesses}>
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {results.businesses.map(b => (
                    <li key={b.id}><BusinessRow business={b} /></li>
                  ))}
                </ul>
              </Section>
            )}
          </div>
        </>
      )}
    </PageShell>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TabPill({ href, label, count }: { href: string; label: string; count: number }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 whitespace-nowrap px-3 py-1.5 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-green-300 dark:hover:border-green-700 transition-colors"
    >
      {label}
      <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-gray-100 dark:bg-gray-800 text-[11px] font-semibold text-gray-600 dark:text-gray-400 px-1.5">
        {count}
      </span>
    </a>
  )
}

function Section({ id, title, count, children }: {
  id: string
  title: string
  count: number
  children: React.ReactNode
}) {
  return (
    <section id={id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden scroll-mt-20">
      <div className="px-5 py-3 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{count}</span>
      </div>
      {children}
    </section>
  )
}

function ProfileRow({ profile }: { profile: SearchProfile }) {
  const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Unnamed member'
  const href = profile.username ? `/u/${profile.username}` : `/directory/${profile.id}`
  const subtitle = [profile.role, profile.institution].filter(Boolean).join(' · ')
  return (
    <Link href={href} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      {profile.avatar_url ? (
        <Image src={profile.avatar_url} alt="" width={40} height={40} className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-100 dark:border-gray-800" />
      ) : (
        <span className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 font-bold flex items-center justify-center shrink-0">
          {(profile.first_name?.[0] || '?').toUpperCase()}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{name}</p>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>}
      </div>
    </Link>
  )
}

function OpportunityRow({ opportunity: o }: { opportunity: SearchOpportunity }) {
  const subtitle = [o.type, o.organisation, o.location].filter(Boolean).join(' · ')
  return (
    <Link href={`/opportunities/${o.id}`} className="block px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{o.title}</p>
      {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{subtitle}</p>}
      {o.deadline && (
        <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-0.5">
          Deadline: {new Date(o.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      )}
    </Link>
  )
}

function GrantRow({ grant: g }: { grant: SearchGrant }) {
  const subtitle = [g.funder, g.category, g.region].filter(Boolean).join(' · ')
  return (
    <Link href={`/grants/${g.id}`} className="block px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{g.title}</p>
      {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{subtitle}</p>}
      {g.deadline && (
        <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-0.5">
          Deadline: {new Date(g.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      )}
    </Link>
  )
}

function MarketplaceRow({ listing: m }: { listing: SearchMarketplaceListing }) {
  const subtitle = [m.category, m.state].filter(Boolean).join(' · ')
  return (
    <Link href={`/marketplace/${m.id}`} className="block px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{m.title}</p>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{subtitle}</p>}
        </div>
        {m.price != null && (
          <span className="text-sm font-semibold text-green-700 dark:text-green-400 shrink-0">
            ₦{m.price.toLocaleString('en-NG')}
          </span>
        )}
      </div>
    </Link>
  )
}

function BusinessRow({ business: b }: { business: SearchBusiness }) {
  const href = b.slug ? `/b/${b.slug}` : `/businesses`
  const subtitle = [b.sector, b.state].filter(Boolean).join(' · ')
  return (
    <Link href={href} className="block px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{b.name}</p>
        {b.is_verified && (
          <span className="text-[10px] font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded">
            ✓ Verified
          </span>
        )}
      </div>
      {b.tagline && <p className="text-xs text-gray-600 dark:text-gray-300 truncate mt-0.5">{b.tagline}</p>}
      {subtitle && <p className="text-[11px] text-gray-500 dark:text-gray-500 truncate mt-0.5">{subtitle}</p>}
    </Link>
  )
}
