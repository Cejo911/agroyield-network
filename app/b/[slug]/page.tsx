import { notFound, permanentRedirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import AppNav from '@/app/components/AppNav'
import { PrimaryLink } from '@/app/components/design/Button'
import BusinessLogo from '@/app/components/design/BusinessLogo'
import { safeHref } from '@/lib/safe-href'
import ReportButton from '@/app/components/ReportButton'
import WriteReviewButton from './WriteReviewButton'

/**
 * Public business page: /b/{slug}
 *
 * Purpose: mini marketing/landing page for a business on AgroYield.
 * - Service-role read (bypass RLS) but filters on is_public = true in code.
 * - If slug is a retired alias, 301-redirects to /b/{current_slug}.
 * - If slug hits a private or non-existent business, returns 404.
 * - If viewer is logged in, shows AppNav; otherwise shows the public marketing nav.
 */

const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://agroyield.africa'

type BusinessRow = {
  id: string
  user_id: string
  name: string
  slug: string
  is_public: boolean
  address: string | null
  phone: string | null
  alt_phone: string | null
  whatsapp: string | null
  email: string | null
  cac_number: string | null
  bank_name: string | null
  account_name: string | null
  account_number: string | null
  sector: string | null
  state: string | null
  logo_url: string | null
  // Showcase fields (migration 20260418_business_showcase.sql)
  tagline: string | null
  about: string | null
  cover_image_url: string | null
  website: string | null
  instagram: string | null
  facebook: string | null
  opening_hours: string | null
  founded_year: number | null
  // Verified badge (migration 20260418_business_verified.sql)
  is_verified: boolean
  verified_at: string | null
}

type ReviewRow = {
  id: string
  reviewer_id: string
  rating: number
  headline: string | null
  body: string | null
  seller_reply: string | null
  replied_at: string | null
  created_at: string
  reviewer: {
    id: string
    full_name: string | null
    avatar_url: string | null
  } | null
}

type ProductRow = {
  id: string
  name: string
  unit: string | null
  unit_price: number | null
  is_active: boolean
}

const BUSINESS_SELECT =
  'id, user_id, name, slug, is_public, address, phone, alt_phone, whatsapp, email, ' +
  'cac_number, bank_name, account_name, account_number, sector, state, logo_url, ' +
  'tagline, about, cover_image_url, website, instagram, facebook, opening_hours, founded_year, ' +
  'is_verified, verified_at'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function resolveSlug(slug: string): Promise<
  | { kind: 'live'; business: BusinessRow }
  | { kind: 'alias'; currentSlug: string }
  | { kind: 'none' }
> {
  const admin = getAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  // 1. Try live slug
  const { data: live } = await adminAny
    .from('businesses')
    .select(BUSINESS_SELECT)
    .eq('slug', slug)
    .maybeSingle()
  if (live) return { kind: 'live', business: live as BusinessRow }

  // 2. Try alias — look up old_slug → business_id → current slug
  const { data: alias } = await adminAny
    .from('business_slug_aliases')
    .select('business_id, businesses:business_id(slug, is_public)')
    .eq('old_slug', slug)
    .maybeSingle()
  if (alias?.businesses?.slug && alias.businesses.is_public) {
    return { kind: 'alias', currentSlug: alias.businesses.slug }
  }

  return { kind: 'none' }
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const result = await resolveSlug(slug)
  if (result.kind !== 'live' || !result.business.is_public) {
    return { title: 'Business not found — AgroYield Network' }
  }
  const b = result.business
  const desc = (
    b.tagline ||
    b.about?.slice(0, 155) ||
    `${b.name}${b.sector ? ` — ${b.sector}` : ''}${
      b.state ? ` · ${b.state}` : b.address ? ` · ${b.address}` : ''
    } on AgroYield Network, Nigeria's agricultural professional network.`
  ).slice(0, 155)
  return {
    title: `${b.name} — AgroYield Network`,
    description: desc,
    openGraph: {
      title: b.name,
      description: desc,
      url: `${SITE_ORIGIN}/b/${b.slug}`,
      type: 'website',
      images: b.cover_image_url
        ? [{ url: b.cover_image_url }]
        : b.logo_url
        ? [{ url: b.logo_url }]
        : undefined,
    },
    alternates: {
      canonical: `${SITE_ORIGIN}/b/${b.slug}`,
    },
  }
}

export default async function PublicBusinessPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const resolved = await resolveSlug(slug)

  if (resolved.kind === 'alias') {
    permanentRedirect(`/b/${resolved.currentSlug}`)
  }
  if (resolved.kind === 'none' || !resolved.business.is_public) {
    notFound()
  }

  const b = resolved.business

  // Detect logged-in viewer for nav (using normal client — respects RLS)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = getAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  // Active catalog only
  const { data: productsRaw } = await adminAny
    .from('business_products')
    .select('id, name, unit, unit_price, is_active')
    .eq('business_id', b.id)
    .eq('is_active', true)
    .order('name')
    .limit(50)
  const products = (productsRaw ?? []) as ProductRow[]

  // Published business reviews + reviewer profile. RLS is bypassed by the
  // admin client, so we explicitly filter on `published = true` here. The
  // owner seeing their own unpublished rows is handled at the admin dashboard,
  // not on the public page.
  const { data: reviewsRaw } = await adminAny
    .from('business_reviews')
    .select(
      'id, reviewer_id, rating, headline, body, seller_reply, replied_at, created_at, ' +
      'reviewer:profiles!business_reviews_reviewer_id_fkey(id, full_name, avatar_url)'
    )
    .eq('business_id', b.id)
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(50)
  const reviews = (reviewsRaw ?? []) as ReviewRow[]

  const reviewCount = reviews.length
  const avgRating = reviewCount > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
    : 0

  // Does the logged-in viewer already have a review on this business? If so,
  // hide the "Write a review" button — the POST API would 409 anyway.
  const viewerIsOwner = !!user && user.id === b.user_id
  const viewerAlreadyReviewed = !!user && reviews.some((r) => r.reviewer_id === user.id)
  const canWriteReview = !!user && !viewerIsOwner && !viewerAlreadyReviewed

  const reviewDateFmt = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-NG', {
        year: 'numeric', month: 'short', day: 'numeric',
      })
    } catch { return '' }
  }

  const fmt = (n: number | null) =>
    n == null ? '—' : `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`

  const initials = b.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('') || '?'

  const whatsappHref = b.whatsapp
    ? `https://wa.me/${b.whatsapp.replace(/[^0-9]/g, '')}`
    : null

  // Normalise social handles → URLs
  const instagramUrl = b.instagram
    ? b.instagram.startsWith('http')
      ? b.instagram
      : `https://instagram.com/${b.instagram.replace(/^@/, '')}`
    : null
  const facebookUrl = b.facebook
    ? b.facebook.startsWith('http')
      ? b.facebook
      : `https://facebook.com/${b.facebook.replace(/^@/, '')}`
    : null
  const websiteUrl = safeHref(b.website)

  // ── LocalBusiness structured data (JSON-LD) ────────────────────────────
  // Enables Google rich-snippet rendering. All source fields are already
  // sanitised at the API boundary (lib/sanitise.ts, Phase 4.5).
  //
  // Stable @id (`/b/{slug}#business`) lets the entity be referenced from the
  // sitewide Organization/WebSite graph in layout.tsx without re-declaring.
  // parentOrganization points back to the AgroYield Network Organization —
  // communicates to Google that this LocalBusiness operates under the AgroYield
  // umbrella, which strengthens brand-entity trust signals across the site.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jsonLd: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${SITE_ORIGIN}/b/${b.slug}#business`,
    name: b.name,
    url: `${SITE_ORIGIN}/b/${b.slug}`,
    parentOrganization: { '@id': `${SITE_ORIGIN}/#organization` },
  }
  if (b.tagline) jsonLd.slogan = b.tagline
  if (b.about) jsonLd.description = b.about.slice(0, 500)
  if (b.logo_url) jsonLd.logo = b.logo_url
  const primaryImage = b.cover_image_url || b.logo_url
  if (primaryImage) jsonLd.image = primaryImage
  if (b.phone) jsonLd.telephone = b.phone
  if (b.email) jsonLd.email = b.email
  if (b.address || b.state) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const addr: Record<string, any> = { '@type': 'PostalAddress', addressCountry: 'NG' }
    if (b.address) addr.streetAddress = b.address
    if (b.state) addr.addressRegion = b.state
    jsonLd.address = addr
  }
  if (b.founded_year) jsonLd.foundingDate = String(b.founded_year)
  if (b.opening_hours) jsonLd.openingHours = b.opening_hours
  if (b.sector) jsonLd.knowsAbout = b.sector
  const sameAs = [websiteUrl, instagramUrl, facebookUrl].filter((u): u is string => Boolean(u))
  if (sameAs.length > 0) jsonLd.sameAs = sameAs

  // ── BreadcrumbList structured data (JSON-LD) ───────────────────────────
  // 3-rung trail: AgroYield Network → Businesses → {Business Name}.
  // Google surfaces breadcrumbs in SERPs (replaces the raw URL under the
  // title), which improves CTR and reinforces site hierarchy. The middle
  // rung points at the public directory index (/businesses, shipped in B1).
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'AgroYield Network', item: SITE_ORIGIN },
      { '@type': 'ListItem', position: 2, name: 'Businesses',        item: `${SITE_ORIGIN}/businesses` },
      { '@type': 'ListItem', position: 3, name: b.name,              item: `${SITE_ORIGIN}/b/${b.slug}` },
    ],
  }

  // Escape `<` → `\u003c` to prevent any `</script>` breakout inside the
  // inline script tag. Valid JSON either way (JSON accepts \u003c).
  //
  // Parser-compat note (20 Apr 2026, Sentry issue f2499c29…): we previously
  // emitted ONE <script> containing `[jsonLd, breadcrumbJsonLd]` as an array.
  // Google parses top-level arrays fine, but naive parsers in the wild
  // (browser extensions, Safari Reader Mode, SEO toolbars) call
  // `JSON.parse(s.textContent)["@context"].toLowerCase()` on each script's
  // contents directly and crash when the root is an array (arrays don't have
  // `@context`). Split into two scripts so every root is a single object with
  // a top-level `@context`. Mirrors the fix in app/layout.tsx.
  const localBusinessJsonLdScript = JSON.stringify(jsonLd).replace(/</g, '\\u003c')
  const breadcrumbJsonLdScript    = JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* LocalBusiness + BreadcrumbList structured data — SEO rich snippet.   */}
      {/* Two <script> blocks (not one JSON array) per the parser-compat note  */}
      {/* above; sitewide Organization + WebSite schemas live in layout.tsx    */}
      {/* and are referenced by @id via parentOrganization above.              */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: localBusinessJsonLdScript }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLdScript }}
      />
      {/* Nav: AppNav for logged-in members, marketing nav for anonymous visitors */}
      {user ? <AppNav /> : (
        <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center shrink-0 no-underline">
            {/* Icon only on mobile */}
            <Image
              src="/logo-icon-colored.png"
              alt="AgroYield Network"
              width={44}
              height={44}
              className="block sm:hidden"
            />
            {/* Horizontal logo on desktop */}
            <Image
              src="/logo-horizontal-colored.png"
              alt="AgroYield Network"
              width={200}
              height={50}
              className="hidden sm:block dark:hidden"
            />
            <Image
              src="/logo-horizontal-white.png"
              alt="AgroYield Network"
              width={200}
              height={50}
              className="hidden dark:sm:block"
            />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium">
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

      {/* Cover image banner — full-bleed */}
      {b.cover_image_url && (
        <div
          className="w-full h-48 sm:h-64 bg-cover bg-center"
          style={{ backgroundImage: `url(${b.cover_image_url})` }}
          role="img"
          aria-label={`${b.name} cover image`}
        />
      )}

      <main id="main" className="max-w-3xl mx-auto px-4 py-10">
        {/* Header card */}
        <section
          className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-8 mb-6 ${
            b.cover_image_url ? '-mt-16 relative z-10' : ''
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-start gap-6">
            {/* Logo — primitive owns box, clipping, and shrink behaviour */}
            <BusinessLogo
              src={b.logo_url}
              name={b.name}
              size="xl"
              fallbackTone="strong"
              label={initials}
              className="shadow-sm"
              priority
            />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
                <span>{b.name}</span>
                {b.is_verified && (
                  <span
                    className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-2 py-0.5 rounded-full"
                    title="Admin-verified business on AgroYield Network"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Verified
                  </span>
                )}
              </h1>
              {b.tagline && (
                <p className="text-sm text-green-700 dark:text-green-400 font-medium mt-1 italic">{b.tagline}</p>
              )}
              {b.address && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">📍 {b.address}</p>
              )}
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-gray-500 dark:text-gray-500">
                {b.cac_number && <span>CAC: {b.cac_number}</span>}
                {b.founded_year && <span>· Founded {b.founded_year}</span>}
              </div>

              {/* Contact row */}
              <div className="flex flex-wrap gap-2 mt-4">
                {b.phone && (
                  <a
                    href={`tel:${b.phone}`}
                    className="text-xs bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-full"
                  >
                    📞 {b.phone}
                  </a>
                )}
                {whatsappHref && (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-full"
                  >
                    💬 WhatsApp
                  </a>
                )}
                {b.email && (
                  <a
                    href={`mailto:${b.email}`}
                    className="text-xs bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-full"
                  >
                    ✉ {b.email}
                  </a>
                )}
                {b.sector && (
                  <span className="text-xs bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-full">
                    🌾 {b.sector}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* About */}
          {b.about && (
            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
              <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                About
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{b.about}</p>
            </div>
          )}

          {/* Socials + website */}
          {(websiteUrl || instagramUrl || facebookUrl) && (
            <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-4">
              {websiteUrl && (
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-green-600 dark:text-green-400 hover:underline"
                >
                  🌐 Website
                </a>
              )}
              {instagramUrl && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-pink-600 dark:text-pink-400 hover:underline"
                >
                  📸 Instagram
                </a>
              )}
              {facebookUrl && (
                <a
                  href={facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  👥 Facebook
                </a>
              )}
            </div>
          )}

          {/* Opening hours */}
          {b.opening_hours && (
            <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
              <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                🕒 Opening Hours
              </h2>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{b.opening_hours}</p>
            </div>
          )}
        </section>

        {/* Catalog */}
        {products.length > 0 && (
          <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 mb-6">
            <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Products & Services</h2>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{p.name}</p>
                    {p.unit && <p className="text-xs text-gray-500 dark:text-gray-500">per {p.unit}</p>}
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{fmt(p.unit_price)}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Bank details — optional, only if all three present */}
        {b.bank_name && b.account_name && b.account_number && (
          <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 mb-6">
            <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Payment Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Bank</p>
                <p className="font-medium text-gray-900 dark:text-white">{b.bank_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Account Name</p>
                <p className="font-medium text-gray-900 dark:text-white">{b.account_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Account Number</p>
                <p className="font-mono font-medium text-gray-900 dark:text-white">{b.account_number}</p>
              </div>
            </div>
          </section>
        )}

        {/* Reviews */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="font-semibold text-gray-800 dark:text-gray-200">Reviews</h2>
              {reviewCount > 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  <span className="text-amber-500 dark:text-amber-400" aria-hidden="true">
                    {'★'.repeat(Math.round(avgRating))}{'☆'.repeat(5 - Math.round(avgRating))}
                  </span>
                  <span className="ml-2">
                    {avgRating.toFixed(1)} · {reviewCount} review{reviewCount === 1 ? '' : 's'}
                  </span>
                </p>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">No reviews yet.</p>
              )}
            </div>
            {canWriteReview && (
              <WriteReviewButton businessId={b.id} businessName={b.name} />
            )}
            {viewerIsOwner && (
              <span className="text-xs text-gray-500 dark:text-gray-500 italic">
                You can&rsquo;t review your own business.
              </span>
            )}
            {viewerAlreadyReviewed && (
              <span className="text-xs text-gray-500 dark:text-gray-500 italic">
                You&rsquo;ve already reviewed this business.
              </span>
            )}
            {!user && reviewCount === 0 && (
              <Link
                href={`/login?next=${encodeURIComponent(`/b/${b.slug}`)}`}
                className="text-xs text-green-700 dark:text-green-400 font-medium hover:underline"
              >
                Sign in to review
              </Link>
            )}
          </div>

          {reviews.length > 0 && (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {reviews.map((r) => {
                const reviewerName = r.reviewer?.full_name?.trim() || 'AgroYield member'
                const reviewerInitials = reviewerName
                  .split(/\s+/).slice(0, 2)
                  .map((w) => w.charAt(0).toUpperCase()).join('') || '?'
                return (
                  <article key={r.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      {r.reviewer?.avatar_url ? (
                        <div
                          style={{ backgroundImage: `url(${r.reviewer.avatar_url})` }}
                          className="w-9 h-9 rounded-full bg-cover bg-center shrink-0 border border-gray-200 dark:border-gray-700"
                          role="img"
                          aria-label={reviewerName}
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 flex items-center justify-center text-xs font-semibold shrink-0">
                          {reviewerInitials}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{reviewerName}</p>
                          <span className="text-amber-500 dark:text-amber-400 text-xs" aria-label={`${r.rating} out of 5 stars`}>
                            {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-500">{reviewDateFmt(r.created_at)}</span>
                        </div>
                        {r.headline && (
                          <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{r.headline}</p>
                        )}
                        {r.body && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mt-1 whitespace-pre-wrap">{r.body}</p>
                        )}

                        {r.seller_reply && (
                          <div className="mt-3 ml-2 pl-3 border-l-2 border-green-200 dark:border-green-800 bg-green-50/40 dark:bg-green-900/20 rounded-r-md py-2 pr-3">
                            <p className="text-xs font-semibold text-green-800 dark:text-green-300">
                              Reply from {b.name}
                              {r.replied_at && (
                                <span className="ml-2 text-gray-500 dark:text-gray-500 font-normal">
                                  · {reviewDateFmt(r.replied_at)}
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap">{r.seller_reply}</p>
                          </div>
                        )}

                        {/* Report — logged-in members only, not on your own review */}
                        {user && user.id !== r.reviewer_id && (
                          <div className="mt-2">
                            <ReportButton postId={r.id} postType="business_review" />
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        {/* Follow CTA — hidden for logged-in members (already inside the app) */}
        {/* `?intent=follow_business&biz={slug}` threads the follow intent through signup
             so a future session can read it and auto-follow the owner post-signup.
             `?next=/b/{slug}` on /login bounces returning members back to this page. */}
        {!user && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-6 text-center">
            <p className="text-green-800 dark:text-green-300 font-semibold mb-1">
              Follow {b.name} on AgroYield Network
            </p>
            <p className="text-green-700 dark:text-green-400 text-sm mb-4">
              Get updates from {b.name}, message them directly, and discover other Nigerian agri businesses.
            </p>
            <div className="flex justify-center gap-3 flex-wrap">
              {/* Primary "Follow" uses the lg-size design primitive — matches    */}
              {/* /mentorship's gated CTAs and other centered hero callouts.     */}
              <PrimaryLink
                href={`/signup?intent=follow_business&biz=${encodeURIComponent(b.slug)}`}
                size="lg"
              >
                Follow {b.name}
              </PrimaryLink>
              {/* Sign-in stays inline — green-tinted outline (border-green-300, */}
              {/* text-green-700) doesn't yet match the gray SecondaryLink       */}
              {/* default. Promote when a 3rd green-tinted secondary appears.    */}
              <Link
                href={`/login?next=${encodeURIComponent(`/b/${b.slug}`)}`}
                className="inline-flex items-center justify-center border border-green-300 dark:border-green-800 text-green-700 dark:text-green-400 px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
              >
                Already a member? Sign in
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
