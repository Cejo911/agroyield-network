import AppNav from '@/app/components/AppNav'
import FAQClient from './faq-client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FAQ — AgroYield Network',
  description: 'Frequently asked questions about AgroYield Network modules, features, and subscriptions.',
}

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <main className="px-4 py-12">
        <FAQClient />
      </main>
    </div>
  )
}
