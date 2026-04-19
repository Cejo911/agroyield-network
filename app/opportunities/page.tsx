import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OpportunitiesClient from './opportunities-client'
import FAQAccordion from '@/app/components/FAQAccordion'
import PageShell from '@/app/components/design/PageShell'
import PageHeader from '@/app/components/design/PageHeader'
import { PrimaryLink } from '@/app/components/design/Button'
import { MODULE_FAQS } from '@/lib/faq-data'

export default async function OpportunitiesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: opportunities } = await supabase
    .from('opportunities')
    .select('id, user_id, title, type, organisation, location, description, deadline, is_closed, created_at, thumbnail_url')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  return (
    <PageShell maxWidth="4xl">
      <PageHeader
        title="Opportunities"
        description="Jobs, internships, partnerships and training in agriculture."
        actions={<PrimaryLink href="/opportunities/new">Post opportunity</PrimaryLink>}
      />
      <OpportunitiesClient opportunities={(opportunities ?? []) as any} userId={user.id} />
      <FAQAccordion items={MODULE_FAQS.opportunities} title="Frequently Asked Questions" subtitle="Common questions about Opportunities" compact />
    </PageShell>
  )
}
