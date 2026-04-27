import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ResearchClient from './research-client'
import FAQAccordion from '@/app/components/FAQAccordion'
import PageShell from '@/app/components/design/PageShell'
import PageHeader from '@/app/components/design/PageHeader'
import { PrimaryLink } from '@/app/components/design/Button'
import { MODULE_FAQS } from '@/lib/faq-data'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

type ProfileRow = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'id' | 'first_name' | 'last_name' | 'avatar_url' | 'username'
>

// Mirrors the ResearchPost shape used by ResearchClient (non-null user_id and
// created_at). DB columns are nullable, but in practice always set; we filter
// out the rare null rows below.
type ResearchPost = {
  id: string
  user_id: string
  title: string
  type: string | null
  content: string
  tags: string[] | null
  cover_image_url: string | null
  is_locked: boolean
  created_at: string
}

export default async function ResearchPage() {
  const supabase = (await createClient()) as SupabaseClient<Database>
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: posts } = await supabase
    .from('research_posts')
    .select('id, user_id, title, type, content, tags, cover_image_url, is_locked, created_at')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  const postList: ResearchPost[] = (posts ?? [])
    .filter((p) => p.user_id !== null && p.created_at !== null)
    .map((p) => ({ ...p, user_id: p.user_id as string, created_at: p.created_at as string }))
  const userIds = [...new Set(postList.map((p) => p.user_id))]

  const { data: profiles } = userIds.length > 0
    ? await supabase.from('profiles').select('id, first_name, last_name, avatar_url, username').in('id', userIds)
    : { data: [] as ProfileRow[] }

  const profileMap: Record<string, ProfileRow> = {}
  for (const p of (profiles ?? []) as ProfileRow[]) profileMap[p.id] = p

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
