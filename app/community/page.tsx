import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CommunityClient from './community-client'
import FAQAccordion from '@/app/components/FAQAccordion'
import PageShell from '@/app/components/design/PageShell'
import PageHeader from '@/app/components/design/PageHeader'
import { MODULE_FAQS } from '@/lib/faq-data'

export default async function CommunityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any

  // Fetch posts, profiles, like counts, and user likes in parallel
  const { data: posts } = await supabaseAny
    .from('community_posts')
    .select('*')
    .eq('is_active', true)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50)

  const postList = (posts ?? []) as any[]

  // Fetch parent posts for any reposts
  const parentIds = [...new Set(postList.map((p: any) => p.reposted_from).filter(Boolean))]
  const { data: parentPosts } = parentIds.length > 0
    ? await supabaseAny.from('community_posts').select('*').in('id', parentIds)
    : { data: [] }
  const parentList = (parentPosts ?? []) as any[]
  const parentMap: Record<string, any> = {}
  for (const p of parentList) parentMap[p.id] = p

  const userIds = [...new Set([
    ...postList.map((p: any) => p.user_id),
    ...parentList.map((p: any) => p.user_id),
  ])]
  // Include parent ids for like/comment counts too
  const postIds = [...postList.map((p: any) => p.id), ...parentList.map((p: any) => p.id)]

  const [{ data: profiles }, { data: allLikes }, { data: userLikes }, { data: commentCounts }] = await Promise.all([
    userIds.length > 0
      ? supabase.from('profiles').select('id, first_name, last_name, role, avatar_url, username, last_seen_at').in('id', userIds)
      : Promise.resolve({ data: [] }),
    postIds.length > 0
      ? supabaseAny.from('likes').select('post_id').eq('post_type', 'community').in('post_id', postIds)
      : Promise.resolve({ data: [] }),
    postIds.length > 0
      ? supabaseAny.from('likes').select('post_id').eq('post_type', 'community').eq('user_id', user.id).in('post_id', postIds)
      : Promise.resolve({ data: [] }),
    postIds.length > 0
      ? supabaseAny.from('comments').select('post_id').eq('post_type', 'community').in('post_id', postIds)
      : Promise.resolve({ data: [] }),
  ])

  // Build maps
  const profileMap: Record<string, any> = {}
  for (const p of (profiles ?? []) as any[]) profileMap[p.id] = p

  const likeCountMap: Record<string, number> = {}
  for (const l of (allLikes ?? []) as any[]) likeCountMap[l.post_id] = (likeCountMap[l.post_id] || 0) + 1

  const userLikedArr: string[] = (userLikes ?? []).map((l: any) => l.post_id)
  const userLikedSet = new Set(userLikedArr)

  const commentCountMap: Record<string, number> = {}
  for (const c of (commentCounts ?? []) as any[]) commentCountMap[c.post_id] = (commentCountMap[c.post_id] || 0) + 1

  return (
    <PageShell maxWidth="3xl">
      <PageHeader
        title="Community"
        description="Share ideas, ask questions, celebrate wins, and connect with the agri community."
      />
      <CommunityClient
        posts={postList}
        parentMap={parentMap}
        profileMap={profileMap}
        likeCountMap={likeCountMap}
        userLikedSet={Array.from(userLikedSet)}
        commentCountMap={commentCountMap}
        currentUserId={user.id}
      />
      <FAQAccordion items={MODULE_FAQS.community} title="Frequently Asked Questions" subtitle="Common questions about Community" compact />
    </PageShell>
  )
}
