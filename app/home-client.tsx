import type { Metadata } from 'next'
import HomeClient from './home-client'

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

export default function Home() {
  return <HomeClient />
}
