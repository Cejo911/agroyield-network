import type { MetadataRoute } from 'next'

const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://agroyield.africa'

/**
 * robots.txt — served at /robots.txt.
 *
 * Policy:
 *   - Crawl the public marketing site + /b/{slug} business pages + /u/{username} member profiles
 *   - Block everything behind auth (/dashboard, /admin, /api, /business, /messages, /mentorship, etc.)
 *   - Block auth endpoints and one-off email links
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/b/', '/u/'],
        disallow: [
          '/api/',
          '/admin/',
          '/admin',
          '/dashboard',
          '/dashboard/',
          '/business/',
          '/messages',
          '/messages/',
          '/mentorship/',
          '/grants/',
          '/marketplace/',
          '/opportunities/',
          '/prices/',
          '/research/',
          '/community/',
          '/directory/',
          '/profile',
          '/profile/',
          '/settings',
          '/settings/',
          '/auth/',
          '/login',
          '/signup',
          '/forgot-password',
          '/invoice-print',
          '/maintenance',
          '/email/',
        ],
      },
    ],
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    host: SITE_ORIGIN,
  }
}
