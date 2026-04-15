import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import "./globals.css"
import AnnouncementBanner from "./components/AnnouncementBanner"
import ThemeProvider from "./components/ThemeProvider"
import PostHogProvider from "./components/PostHogProvider"

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
        <PostHogProvider>
          <ThemeProvider>
            <AnnouncementBanner />
            {children}
          </ThemeProvider>
        </PostHogProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
