import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import AppNav from '@/app/components/AppNav'
import PublicFooter from '@/app/components/PublicFooter'
import BusinessLogo from '@/app/components/design/BusinessLogo'

/**
 * /businesses — public directory index.
 *
 * Purpose:
 *   • Public, indexable listing of every `is_public = true` business on
 *     AgroYield Network.
 *   • Serves as the canonical destination for Google's SearchAction, for
 *     breadcrumb rung 2 on /b/{slug}, and for the "Browse agribusinesses"
 *     CTA on the landing page.
 *
 * Auth / RLS:
 *   • Service-role read (same pattern as app/sitemap.ts and /b/[slug]). RLS
 *     is bypassed but we filter on is_public = true in SQL, and every column
 *     we select is already public-safe (no bank_account, no phone for
 *     anonymous viewers — see later SELECT list).
 *
 * URL params (GET, so crawlable + bookmarkable):
 *   ?q=       free-text search against name, tagline, about
 *   ?sector=  exact-match filter (e.g. "Crop Farming")
 *   ?state=   exact-match filter (e.g. "Lagos")
 *   ?page=    1-indexed page number
 *
 * Pagination:
 *   PAGE_SIZE rows per page, server-side .range(). Pagination links preserve
 *   all current filters via buildHref().
 */

const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://agroyield.africa'

// Mirrored from app/business/setup/page.tsx. TODO: extract to lib/constants
// once another page needs them — third copy earns the refactor.
const SECTORS = [
  'Crop Farming',
  'Livestock & Poultry',
  'Fisheries & Aquaculture',
  'Agro-Processing',
  'Input Supply',
  'Agri-Tech',
  'Logistics & Storage',
  'Consulting & Training',
  'Other',
]

const NIGERIAN_STATES = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
  'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe',
  'Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara',
  'Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau',
  'Rivers','Sokoto','Taraba','Yobe','Zamfara',
]

const PAGE_SIZE = 24 // 4 × 6 on wide screens, 2 × 12 on tablets, 1 × 24 on mobile

/**
 * Columns safe to expose to anonymous crawlers / visitors. Deliberately NOT
 * selecting phone, email, bank_*, whatsapp — those only render on the
 * individual /b/{slug} page where the owner has opted in to the full profile.
 * The index is a shopfront preview.
 */
const CARD_SELECT =
  'id, name, slug, sector, state, logo_url, cover_image_url, tagline, is_verified'

type BusinessCard = {
  id: string
  name: string
  slug: string
  sector: string | null
  state: string | null
  logo_url: string | null
  cover_image_url: string | null
  tagline: string | null
  is_verified: boolean
}

export const metadata: Metadata = {
  title: 'Agribusinesses on AgroYield Network',
  description:
    "Browse verified agribusinesses across Nigeria — crop farms, livestock, agro-processing, input suppliers, agri-tech and more. Discover who's building in Nigerian agriculture.",
  openGraph: {
    title: 'Agribusinesses on AgroYield Network',
    description:
      "Browse verified agribusinesses across Nigeria — crop farms, livestock, agro-processing, input suppliers, agri-tech and more.",
    url: `${SITE_ORIGIN}/businesses`,
    type: 'website',
  },
  alternates: {
    canonical: `${SITE_ORIGIN}/businesses`,
  },
}

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Escape %, _ and \ in a user-supplied search string so they don't act as
 * wildcards inside ILIKE. Without this, a query of "10%" would match every
 * row containing "10" followed by any characters.
 */
function escapeIlike(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

/**
 * Build a query-string URL preserving currently-applied filters, overriding
 * only the keys you pass in. Used for pagination links + "clear filter" chips.
 */
function buildHref(
  current: { q?: string; sector?: string; state?: string; page?: number },
  overrides: Partial<{ q: string; sector: string; state: string; page: number | null }>
): string {
  const merged = { ...current, ...overrides }
  const usp = new URLSearchParams()
  if (merged.q)      usp.set('q', merged.q)
  if (merged.sector) usp.set('sector', merged.sector)
  if (merged.state)  usp.set('state', merged.state)
  if (merged.page && merged.page > 1) usp.set('page', String(merged.page))
  const qs = usp.toString()
  return qs ? `/businesses?${qs}` : '/businesses'
}

export default async function BusinessesIndex({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sector?: string; state?: string; page?: string }>
}) {
  const sp = await searchParams
  const q      = (sp.q      ?? '').trim().slice(0, 80)  // cap length; defensive
  const sector = (sp.sector ?? '').trim()
  const state  = (sp.state  ?? '').trim()
  const pageRaw = parseInt(sp.page ?? '1', 10)
  const page    = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1

  // Validate filter values against whitelists — prevents arbitrary ilike / eq
  // payloads from hitting the DB and keeps crawl space tidy (stray sectors
  // don't create duplicate URLs Google has to canonicalise).
  const sectorValid = SECTORS.includes(sector) ? sector : ''
  const stateValid  = NIGERIAN_STATES.includes(state) ? state : ''

  // ── Query ───────────────────────────────────────────────────────────────
  const admin = getAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  let query = adminAny
    .from('businesses')
    .select(CARD_SELECT, { count: 'exact' })
    .eq('is_public', true)

  if (sectorValid) query = query.eq('sector', sectorValid)
  if (stateValid)  query = query.eq('state',  stateValid)
  if (q) {
    const needle = `%${escapeIlike(q)}%`
    // or() is comma-separated; each condition is column.op.value.
    query = query.or(
      `name.ilike.${needle},tagline.ilike.${needle},about.ilike.${needle}`
    )
  }

  // Verified first, then most-recently-updated. Stable ordering matters for
  // pagination — no surprise reshuffling between pages.
  query = query
    .order('is_verified', { ascending: false })
    .order('updated_at',  { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  const { data: rows, count } = await query
  const businesses = (rows ?? []) as BusinessCard[]
  const totalCount = typeof count === 'number' ? count : businesses.length
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  // Detect logged-in viewer for nav (respects RLS via normal client).
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const current = { q, sector: sectorValid, state: stateValid, page }
  const hasActiveFilter = !!(q || sectorValid || stateValid)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Nav: AppNav for logged-in members, marketing nav for anonymous visitors */}
      {user ? <AppNav /> : (
        <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center shrink-0 no-underline">
            <Image
              src="/logo-icon-colored.png"
              alt="AgroYield Network"
              width={44}
              height={44}
              className="block sm:hidden"
            />
            <Image
              src="/logo-horizontal-colored.png"
              alt="AgroYield Network"
              width={200}
              height={58}
              className="hidden h-[58px] w-auto sm:block dark:hidden"
            />
            <Image
              src="/logo-horizontal-white.png"
              alt="AgroYield Network"
              width={200}
              height={58}
              className="hidden h-[58px] w-auto dark:sm:block"
            />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700"
            >
              Sign up
            </Link>
          </div>
        </nav>
      )}

      {/* Authed-user breadcrumb — gives a clear return path back into the */}
      {/* gated app. Anonymous viewers see only the marketing nav above.    */}
      {user && (
        <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-2 text-xs sm:text-sm">
            <Link
              href="/directory"
              className="inline-flex items-center gap-1 text-gray-500 hover:text-green-700 dark:text-gray-400 dark:hover:text-green-400 transition-colors"
            >
              <span aria-hidden="true">←</span>
              <span>Back to Directory</span>
            </Link>
            <span className="text-gray-300 dark:text-gray-700" aria-hidden="true">/</span>
            <span className="text-gray-700 dark:text-gray-300 font-medium">Public Businesses</span>
          </div>
        </div>
      )}

      {/* Page header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <p className="text-xs font-bold tracking-widest uppercase text-green-600 dark:text-green-400 mb-3">
            Public Directory
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white">
            Agribusinesses on AgroYield
          </h1>
          <p className="mt-3 text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl">
            Discover verified Nigerian agribusinesses — from crop farms and
            livestock operations to agro-processors, input suppliers, and
            agri-tech teams.
          </p>

          {/* Filter form — plain GET so results are crawlable + bookmarkable */}
          <form
            method="GET"
            action="/businesses"
            className="mt-8 grid grid-cols-1 sm:grid-cols-12 gap-3"
          >
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search by name, tagline, or description"
              className="sm:col-span-5 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              maxLength={80}
            />
            <select
              name="sector"
              defaultValue={sectorValid}
              className="sm:col-span-3 px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">All sectors</option>
              {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              name="state"
              defaultValue={stateValid}
              className="sm:col-span-2 px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">All states</option>
              {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              type="submit"
              className="sm:col-span-2 px-4 py-2.5 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Filter
            </button>
          </form>

          {hasActiveFilter && (
            <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 flex items-center flex-wrap gap-x-4 gap-y-1">
              <span>
                {totalCount.toLocaleString('en-NG')} {totalCount === 1 ? 'match' : 'matches'}
              </span>
              <Link
                href="/businesses"
                className="text-green-700 dark:text-green-400 hover:underline font-medium"
              >
                Clear filters
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Results */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        {businesses.length === 0 ? (
          <EmptyState hasActiveFilter={hasActiveFilter} />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {businesses.map(b => (
                <BusinessTile key={b.id} b={b} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <nav
                className="mt-10 flex items-center justify-between gap-4"
                aria-label="Pagination"
              >
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Page <strong>{page}</strong> of <strong>{totalPages}</strong>
                  <span className="hidden sm:inline">
                    {' · '}{totalCount.toLocaleString('en-NG')} {totalCount === 1 ? 'business' : 'businesses'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {page > 1 ? (
                    <Link
                      href={buildHref(current, { page: page === 2 ? null : page - 1 })}
                      className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                      rel="prev"
                    >
                      ← Previous
                    </Link>
                  ) : (
                    <span
                      aria-disabled="true"
                      className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                    >
                      ← Previous
                    </span>
                  )}
                  {page < totalPages ? (
                    <Link
                      href={buildHref(current, { page: page + 1 })}
                      className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                      rel="next"
                    >
                      Next →
                    </Link>
                  ) : (
                    <span
                      aria-disabled="true"
                      className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                    >
                      Next →
                    </span>
                  )}
                </div>
              </nav>
            )}
          </>
        )}
      </main>

      {/* Footer — shared across all public pages (signed-out only, so authed */}
      {/* users stay in the gated app shell). */}
      {!user && <PublicFooter />}
    </div>
  )
}

// ─── Presentational components ─────────────────────────────────────────────

function BusinessTile({ b }: { b: BusinessCard }) {
  const initials = b.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('') || '?'

  return (
    <Link
      href={`/b/${b.slug}`}
      className="group block bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition overflow-hidden"
    >
      {/* Cover */}
      <div
        className="relative h-32 bg-gradient-to-br from-green-500 to-emerald-700"
        style={b.cover_image_url ? { backgroundImage: `url(${b.cover_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
        role="img"
        aria-label={b.cover_image_url ? `${b.name} cover image` : ''}
      >
        {b.is_verified && (
          <span
            className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-green-800 bg-white/95 border border-green-200 px-2 py-0.5 rounded-full shadow-sm"
            title="Admin-verified business on AgroYield Network"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Verified
          </span>
        )}
      </div>

      {/* Body */}
      <div className="relative p-5 pt-0">
        {/* Logo — half-overlapping the cover, primitive owns box + clipping */}
        <div className="-mt-8 mb-3">
          <BusinessLogo
            src={b.logo_url}
            name={b.name}
            size="md"
            fallbackTone="strong"
            label={initials}
            className="shadow"
          />
        </div>

        <h2 className="text-base font-bold text-gray-900 dark:text-white leading-snug line-clamp-2 group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors">
          {b.name}
        </h2>

        {b.tagline && (
          <p className="mt-1 text-sm italic text-green-700 dark:text-green-400 line-clamp-2">
            {b.tagline}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {b.sector && (
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded-full">
              {b.sector}
            </span>
          )}
          {b.state && (
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded-full">
              📍 {b.state}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

function EmptyState({ hasActiveFilter }: { hasActiveFilter: boolean }) {
  return (
    <div className="max-w-lg mx-auto text-center py-16 sm:py-24 px-4">
      <Image src="/logo-icon-colored.png" alt="AgroYield Network" width={56} height={56} className="mx-auto mb-4" />
      {hasActiveFilter ? (
        <>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            No businesses match your filters
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Try broadening your search, or clear filters to see every agribusiness
            currently on AgroYield.
          </p>
          <Link
            href="/businesses"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg"
          >
            Clear filters
          </Link>
        </>
      ) : (
        <>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            The first agribusinesses are onboarding now
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Be among the founding businesses listed on AgroYield Network — join
            the waitlist and claim your spot.
          </p>
          <Link
            href="/#waitlist"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg"
          >
            Join the waitlist →
          </Link>
        </>
      )}
    </div>
  )
}
