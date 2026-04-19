import FAQClient from './faq-client'
import PageShell from '@/app/components/design/PageShell'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FAQ — AgroYield Network',
  description: 'Frequently asked questions about AgroYield Network modules, features, and subscriptions.',
}

// Uses maxWidth="none" because FAQClient renders its own internal width
// container. Visual diff vs. previous markup: vertical padding moves from
// py-12 to PageShell's standard py-10 (2-unit harmonization).
export default function FAQPage() {
  return (
    <PageShell maxWidth="none">
      <FAQClient />
    </PageShell>
  )
}
