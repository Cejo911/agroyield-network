import { notFound, permanentRedirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { createClient as createAdminClient } from '@supabase/supabase-js'

/**
 * Public business page: /b/{slug}
 *
 * - Uses service-role client because listing is public (bypass RLS for read).
 * - Only shows businesses where is_public = true.
 * - If slug is a retired alias, 301-redirects to the current /b/{new_slug}.
 * - If slug hits a private or non-existent business, returns 404.
 */

const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://agroyield.africa'

type BusinessRow = {
  id: string
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
}

type ProductRow = {
  id: string
  name: string
  unit: string | null
  unit_price: number | null
  is_active: boolean
}

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
    .select(
      'id, name, slug, is_public, address, phone, alt_phone, whatsapp, email, cac_number, bank_name, account_name, account_number, sector, state, logo_url'
    )
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
  const desc = `${b.name}${b.sector ? ` — ${b.sector}` : ''}${
    b.state ? ` · ${b.state}` : b.address ? ` · ${b.address}` : ''
  } on AgroYield Network, Nigeria's agricultural professional network.`.slice(0, 155)
  return {
    title: `${b.name} — AgroYield Network`,
    description: desc,
    openGraph: {
      title: b.name,
      description: desc,
      url: `${SITE_ORIGIN}/b/${b.slug}`,
      type: 'website',
      images: b.logo_url ? [{ url: b.logo_url }] : undefined,
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
  const admin = getAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  // Active products only — customer-facing catalog
  const { data: productsRaw } = await adminAny
    .from('business_products')
    .select('id, name, unit, unit_price, is_active')
    .eq('business_id', b.id)
    .eq('is_active', true)
    .order('name')
    .limit(50)
  const products = (productsRaw ?? []) as ProductRow[]

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Public nav (unauthenticated-friendly) */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <Image
            src="/logo-horizontal-colored.png"
            alt="AgroYield Network"
            width={63}
            height={34}
            className="h-[34px] w-auto"
          />
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 font-medium">
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

      <main className="max-w-3xl mx-auto px-4 py-10">
        {/* Header card */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-6">
            {/* Logo */}
            <div className="shrink-0">
              {b.logo_url ? (
                <div
                  style={{ backgroundImage: `url(${b.logo_url})` }}
                  className="w-24 h-24 rounded-xl bg-cover bg-center border border-gray-200 shadow-sm"
                  role="img"
                  aria-label={b.name}
                />
              ) : (
                <div className="w-24 h-24 rounded-xl bg-green-600 flex items-center justify-center text-white text-2xl font-bold shadow-sm">
                  {initials}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900">{b.name}</h1>
              {b.address && (
                <p className="text-sm text-gray-500 mt-1">📍 {b.address}</p>
              )}
              {b.cac_number && (
                <p className="text-xs text-gray-400 mt-1">CAC: {b.cac_number}</p>
              )}

              {/* Contact row */}
              <div className="flex flex-wrap gap-2 mt-4">
                {b.phone && (
                  <a
                    href={`tel:${b.phone}`}
                    className="text-xs bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 px-3 py-1.5 rounded-full"
                  >
                    📞 {b.phone}
                  </a>
                )}
                {whatsappHref && (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 px-3 py-1.5 rounded-full"
                  >
                    💬 WhatsApp
                  </a>
                )}
                {b.email && (
                  <a
                    href={`mailto:${b.email}`}
                    className="text-xs bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 px-3 py-1.5 rounded-full"
                  >
                    ✉ {b.email}
                  </a>
                )}
                {b.sector && (
                  <span className="text-xs bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 rounded-full">
                    🌾 {b.sector}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Catalog */}
        {products.length > 0 && (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
            <h2 className="font-semibold text-gray-800 mb-4">Products & Services</h2>
            <div className="divide-y divide-gray-100">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{p.name}</p>
                    {p.unit && <p className="text-xs text-gray-400">per {p.unit}</p>}
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{fmt(p.unit_price)}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Bank details — optional, only if all three present */}
        {b.bank_name && b.account_name && b.account_number && (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
            <h2 className="font-semibold text-gray-800 mb-3">Payment Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-500">Bank</p>
                <p className="font-medium text-gray-900">{b.bank_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Account Name</p>
                <p className="font-medium text-gray-900">{b.account_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Account Number</p>
                <p className="font-mono font-medium text-gray-900">{b.account_number}</p>
              </div>
            </div>
          </section>
        )}

        {/* Footer CTA */}
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
          <p className="text-green-800 font-semibold mb-1">
            Connect with {b.name} on AgroYield Network
          </p>
          <p className="text-green-700 text-sm mb-4">
            Join Nigeria&apos;s agricultural professional network to follow, message, and collaborate.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/signup"
              className="bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
            >
              Create free account
            </Link>
            <Link
              href="/login"
              className="border border-green-300 text-green-700 px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-100 transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
