import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import "./globals.css"
import AnnouncementBanner from "./components/AnnouncementBanner"
import ThemeProvider from "./components/ThemeProvider"
import PostHogProvider from "./components/PostHogProvider"
import { ToastProvider } from "./components/Toast"

const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://agroyield.africa'

// ── Sitewide JSON-LD ────────────────────────────────────────────────────────
// Two schemas emitted on every page via RootLayout:
//
//   Organization → canonical entity for "AgroYield Network". Unlocks Google
//                  Knowledge Panel eligibility on brand searches.
//   WebSite      → publisher link back to the Organization + SearchAction
//                  pointing at /businesses?q=. Unlocks the sitelinks search
//                  box feature in SERPs once Google trusts the entity.
//
// Both use stable @id URIs (`/#organization`, `/#website`) so downstream
// schemas (LocalBusiness on /b/{slug}, future ItemList on /businesses, etc.)
// can reference them without repeating the full definition.
//
// NOTE on sameAs: intentionally empty. Emitting broken / placeholder social
// URLs is worse than emitting none — Google treats them as a trust signal.
// Once X, LinkedIn, Instagram, Facebook accounts go live, add them here.
const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_ORIGIN}/#organization`,
  name: 'AgroYield Network',
  alternateName: 'AgroYield',
  url: SITE_ORIGIN,
  logo: {
    '@type': 'ImageObject',
    url: `${SITE_ORIGIN}/logo-icon-colored.png`,
    width: 513,
    height: 513,
  },
  description:
    "Nigeria's first digital platform connecting agricultural students, researchers, farmers, and agripreneurs. Grants, mentorship, live commodity prices, marketplace, and research — all in one place.",
  foundingDate: '2026',
  areaServed: { '@type': 'Country', name: 'Nigeria' },
}

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_ORIGIN}/#website`,
  url: SITE_ORIGIN,
  name: 'AgroYield Network',
  publisher: { '@id': `${SITE_ORIGIN}/#organization` },
  inLanguage: 'en-NG',
  // SearchAction target: /businesses?q={term} — shipped in B1.
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_ORIGIN}/businesses?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
}

// Escape `<` → `\u003c` to prevent any `</script>` breakout inside the inline
// script tag. JSON accepts \u003c either way. Same pattern as /b/[slug].
//
// Parser-compat note (20 Apr 2026, Sentry issue f2499c29…): we previously
// emitted ONE <script> containing a JSON array `[organizationJsonLd,
// websiteJsonLd]`. Per JSON-LD spec that's valid — per naive parsers in the
// wild (browser extensions, Safari Reader Mode, SEO toolbars) that do
// `JSON.parse(s.textContent)["@context"].toLowerCase()` on each script's
// contents directly, it's not — arrays don't have `@context`, the parser
// crashes. Splitting into two scripts means every root is a single object
// with a top-level `@context`. Defence-in-depth at the JSON-LD-to-parser
// boundary; rationale mirrored at the corresponding /b/[slug] emission.
const organizationJsonLdScript = JSON.stringify(organizationJsonLd).replace(/</g, '\\u003c')
const websiteJsonLdScript      = JSON.stringify(websiteJsonLd).replace(/</g, '\\u003c')

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://agroyield.africa'),
  title: {
    default: 'AgroYield Network — Nigeria\'s Agricultural Professional Platform',
    template: '%s | AgroYield Network',
  },
  description: 'Nigeria\'s first digital platform connecting agricultural students, researchers, farmers, and agripreneurs. Access grants, mentorship, live commodity prices, a marketplace, and a research board — all in one place.',
  keywords: [
    'agriculture Nigeria',
    'agripreneur',
    'Nigerian farmers',
    'agricultural research Africa',
    'commodity prices Nigeria',
    'agritech Nigeria',
    'farming grants Nigeria',
    'agricultural marketplace',
    'agro network',
    'AgroYield',
  ],
  authors: [{ name: 'AgroYield Network', url: 'https://agroyield.africa' }],
  creator: 'AgroYield Network',
  publisher: 'AgroYield Network',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_NG',
    url: 'https://agroyield.africa',
    siteName: 'AgroYield Network',
    title: 'AgroYield Network — Nigeria\'s Agricultural Professional Platform',
    description: 'Nigeria\'s first digital platform connecting agricultural students, researchers, farmers, and agripreneurs. Grants, mentorship, live prices, marketplace, and research — all in one place.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'AgroYield Network — Agriculture is a Business. Build Yours.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgroYield Network — Nigeria\'s Agricultural Professional Platform',
    description: 'Nigeria\'s first digital platform connecting agricultural students, researchers, farmers, and agripreneurs.',
    images: ['/og-image.png'],
    creator: '@agroyield',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
}

export const viewport: Viewport = {
  themeColor: '#22c55e',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen flex flex-col bg-white dark:bg-gray-950 antialiased`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'){document.documentElement.classList.add('dark');document.documentElement.style.backgroundColor='#030712';}else{document.documentElement.style.backgroundColor='#ffffff';}}catch(e){}})()`,
          }}
        />
        {/* Sitewide JSON-LD: Organization + WebSite. See top of file for the  */}
        {/* two-script-instead-of-one-array rationale (Sentry f2499c29…).      */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: organizationJsonLdScript }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: websiteJsonLdScript }}
        />
        {/* Skip-to-content link for keyboard users.
            Hidden until focused so it doesn't disturb the visual
            layout, then jumps to the main content area on tab —
            saving keyboard users from tabbing through the AppNav's
            ~12 chrome elements before they reach the page content.
            Each page is responsible for putting `id="main"` on its
            primary <main> landmark; pages that haven't been migrated
            yet still benefit because the link gracefully no-ops when
            the anchor target doesn't exist. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-green-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:font-semibold focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
        >
          Skip to main content
        </a>
        <PostHogProvider>
          <ThemeProvider>
            <ToastProvider>
              <AnnouncementBanner />
              {children}
            </ToastProvider>
          </ThemeProvider>
        </PostHogProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
