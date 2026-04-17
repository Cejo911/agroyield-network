import type { MetadataRoute } from 'next'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://agroyield.africa'

/**
 * Dynamic sitemap: static marketing pages + public business pages.
 *
 * Next.js calls this at build/request time and serves /sitemap.xml.
 * Service-role client is used to read public businesses regardless of RLS —
 * we filter to is_public = true here anyway, and only public columns are read.
 *
 * NOTE: Public member profiles (/u/{username}) are intentionally NOT listed —
 * member privacy first. They're still indexable if directly linked, but we
 * don't advertise every member in the sitemap.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_ORIGIN}/`, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${SITE_ORIGIN}/about`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_ORIGIN}/contact`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_ORIGIN}/pricing`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_ORIGIN}/faq`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_ORIGIN}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_ORIGIN}/terms`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_ORIGIN}/data-deletion`, changeFrequency: 'yearly', priority: 0.2 },
  ]

  // Public businesses
  let businessRoutes: MetadataRoute.Sitemap = []
  try {
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminAny = admin as any

    const { data: businesses } = await adminAny
      .from('businesses')
      .select('slug, updated_at')
      .eq('is_public', true)
      .order('updated_at', { ascending: false })
      .limit(5000) // sitemap hard-cap per file is 50k URLs; 5k is well within budget

    businessRoutes = ((businesses ?? []) as { slug: string; updated_at: string }[])
      .filter((b) => b.slug)
      .map((b) => ({
        url: `${SITE_ORIGIN}/b/${b.slug}`,
        lastModified: b.updated_at ? new Date(b.updated_at) : undefined,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }))
  } catch (err) {
    // If DB is briefly unavailable, fall back to static routes rather than 500
    console.error('sitemap: business fetch failed', err)
  }

  return [...staticRoutes, ...businessRoutes]
}
