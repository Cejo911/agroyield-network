import type { Metadata } from 'next'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import HomeClient, { type FeaturedBusiness } from './home-client'

export const metadata: Metadata = {
  title: 'AgroYield Network — Agriculture is a Business. Build Yours.',
  description: 'Join the waitlist for Nigeria\'s first digital platform connecting agricultural students, researchers, farmers, and agripreneurs. Grants, mentorship, live commodity prices, marketplace, and research — all in one place. Launching July 2026.',
  openGraph: {
    title: 'AgroYield Network — Agriculture is a Business. Build Yours.',
    description: 'Nigeria\'s first professional platform for agriculture. Grants, mentorship, live prices, marketplace, and research — all in one place. Launching July 2026.',
    url: 'https://agroyield.africa',
  },
  twitter: {
    title: 'AgroYield Network — Agriculture is a Business. Build Yours.',
    description: 'Nigeria\'s first professional platform for agriculture. Launching July 2026.',
  },
}

// Discovery strip tuning.
//   SHOWCASE_LIMIT     — cap what we display even if there are 20+ qualifiers.
//   SHOWCASE_THRESHOLD — below this, hide the strip entirely. A half-full strip
//                        reads worse than no strip — the section needs to look
//                        like it's already vibrant, not coming-soon.
const SHOWCASE_LIMIT = 6
const SHOWCASE_THRESHOLD = 3

/**
 * Fetch showcase-quality businesses for the landing-page discovery strip.
 *
 * Quality bar — ALL must be present:
 *   • logo_url           (the brand face)
 *   • cover_image_url    (the visual anchor of the tile)
 *   • tagline            (the one-line pitch under the name)
 *
 * Verified profiles surface first, then most-recently-updated. If the query
 * fails (DB hiccup) we return [] and the strip silently hides — we never
 * want a home-page 500 because a DB was momentarily unreachable.
 */
async function fetchShowcaseBusinesses(): Promise<FeaturedBusiness[]> {
  try {
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminAny = admin as any
    const { data } = await adminAny
      .from('businesses')
      .select('id, name, slug, sector, state, logo_url, cover_image_url, tagline, is_verified')
      .eq('is_public', true)
      .not('logo_url',        'is', null)
      .not('cover_image_url', 'is', null)
      .not('tagline',         'is', null)
      .order('is_verified', { ascending: false })
      .order('updated_at',  { ascending: false })
      .limit(SHOWCASE_LIMIT)
    return (data ?? []) as FeaturedBusiness[]
  } catch (err) {
    console.error('home: showcase business fetch failed', err)
    return []
  }
}

export default async function Home() {
  const showcase = await fetchShowcaseBusinesses()
  // Below threshold → hide strip entirely. Empty array is the signal.
  const featured = showcase.length >= SHOWCASE_THRESHOLD ? showcase : []
  return <HomeClient featuredBusinesses={featured} />
}
