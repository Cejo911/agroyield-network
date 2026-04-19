import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GrantsClient from './grants-client'
import FAQAccordion from '@/app/components/FAQAccordion'
import PageShell from '@/app/components/design/PageShell'
import PageHeader from '@/app/components/design/PageHeader'
import { PrimaryLink, SecondaryLink } from '@/app/components/design/Button'
import { MODULE_FAQS } from '@/lib/faq-data'

export default async function GrantsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any

  const [{ data: grants }, { data: applications }, { data: profile }] = await Promise.all([
    supabaseAny
      .from('grants')
      .select('*')
      .order('featured', { ascending: false })
      .order('deadline', { ascending: true }),
    supabaseAny
      .from('grant_applications')
      .select('grant_id, status')
      .eq('user_id', user.id),
    supabase
      .from('profiles')
      .select('is_admin, admin_role')
      .eq('id', user.id)
      .single(),
  ])

  // Build a map of user's applications: grant_id -> status
  const applicationMap: Record<string, string> = {}
  for (const app of (applications ?? []) as { grant_id: string; status: string }[]) {
    applicationMap[app.grant_id] = app.status
  }

  const isAdmin = profile?.is_admin === true

  return (
    <PageShell maxWidth="6xl">
      <PageHeader
        title="Grants & Funding"
        description="Discover grants, fellowships, and funding opportunities in agriculture."
        actions={
          <>
            <SecondaryLink href="/grants/my-applications">My Applications</SecondaryLink>
            {isAdmin && <PrimaryLink href="/grants/post">+ Post Grant</PrimaryLink>}
          </>
        }
      />
      <GrantsClient grants={grants ?? []} applicationMap={applicationMap} />
      <FAQAccordion items={MODULE_FAQS.grants} title="Frequently Asked Questions" subtitle="Common questions about Grants" compact />
    </PageShell>
  )
}
