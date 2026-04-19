import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ResearchClient from './research-client'
import FAQAccordion from '@/app/components/FAQAccordion'
import PageShell from '@/app/components/design/PageShell'
import PageHeader from '@/app/components/design/PageHeader'
import { PrimaryLink } from '@/app/components/design/Button'
import { MODULE_FAQS } from '@/lib/faq-data'

export default async function ResearchPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: posts } = await supabase
    .from('research_posts')
    .select('id, user_id, title, type, content, tags, cover_image_url, is_locked, created_at')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  const postList = (posts ?? []) as any[]
  const userIds = [...new Set(postList.map((p: any) => p.user_id))]

  const { data: profiles } = userIds.length > 0
    ? await supabase.from('profiles').select('id, first_name, last_name, avatar_url, username').in('id', userIds)
    : { data: [] }

  const profileMap: Record<string, any> = {}
  for (const p of (profiles ?? []) as any[]) profileMap[p.id] = p

  return (
    <PageShell maxWidth="4xl">
      <PageHeader
        title="Research Board"
        description="Share findings, ask questions, and collaborate on agricultural research."
        actions={<PrimaryLink href="/research/new">Post research</PrimaryLink>}
      />
      <ResearchClient posts={postList} profileMap={profileMap} userId={user.id} />
      <FAQAccordion items={MODULE_FAQS.research} title="Frequently Asked Questions" subtitle="Common questions about the Research Hub" compact />
    </PageShell>
  )
}
