import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import CommunityClient from './community-client'
import FAQAccordion from '@/app/components/FAQAccordion'
import PageShell from '@/app/components/design/PageShell'
import PageHeader from '@/app/components/design/PageHeader'
import { MODULE_FAQS } from '@/lib/faq-data'
import type { Database } from '@/lib/database.types'

// Local Row aliases — derived from the auto-generated Database type.
// Using these instead of `any` so TS catches mismatched column references
// at build time rather than at runtime via PostgREST 400.
type CommunityPost = Database['public']['Tables']['community_posts']['Row']
type ProfileSummary = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'id' | 'first_name' | 'last_name' | 'role' | 'avatar_url' | 'username' | 'last_seen_at'
>
type LikePostId = Pick<Database['public']['Tables']['likes']['Row'], 'post_id'>
type CommentPostId = Pick<Database['public']['Tables']['comments']['Row'], 'post_id'>
type ReportPostId = Pick<Database['public']['Tables']['reports']['Row'], 'post_id'>

export default async function CommunityPage() {
  // Local cast so .from('table_name').select() returns typed Row shapes.
  // We don't parameterise the global lib/supabase/server.ts client (would
  // ripple changes across ~150 files); typing locally is the bounded fix.
  const supabase = (await createClient()) as SupabaseClient<Database>
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch posts, profiles, like counts, and user likes in parallel
  const { data: posts } = await supabase
    .from('community_posts')
    .select('*')
    .eq('is_active', true)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50)

  const postList: CommunityPost[] = posts ?? []

  // Fetch parent posts for any reposts
  const parentIds = [
    ...new Set(
      postList
        .map((p) => p.reposted_from)
        .filter((id): id is string => Boolean(id))
    ),
  ]
  const { data: parentPosts } = parentIds.length > 0
    ? await supabase.from('community_posts').select('*').in('id', parentIds)
    : { data: [] as CommunityPost[] }
  const parentList: CommunityPost[] = parentPosts ?? []
  const parentMap: Record<string, CommunityPost> = {}
  for (const p of parentList) parentMap[p.id] = p

  const userIds = [...new Set([
    ...postList.map((p) => p.user_id),
    ...parentList.map((p) => p.user_id),
  ])]
  // Include parent ids for like/comment counts too
  const postIds = [...postList.map((p) => p.id), ...parentList.map((p) => p.id)]

  const [
    { data: profiles },
    { data: allLikes },
    { data: userLikes },
    { data: commentCounts },
    { data: userReports },
  ] = await Promise.all([
    userIds.length > 0
      ? supabase.from('profiles').select('id, first_name, last_name, role, avatar_url, username, last_seen_at').in('id', userIds)
      : Promise.resolve({ data: [] as ProfileSummary[] }),
    postIds.length > 0
      ? supabase.from('likes').select('post_id').eq('post_type', 'community').in('post_id', postIds)
      : Promise.resolve({ data: [] as LikePostId[] }),
    postIds.length > 0
      ? supabase.from('likes').select('post_id').eq('post_type', 'community').eq('user_id', user.id).in('post_id', postIds)
      : Promise.resolve({ data: [] as LikePostId[] }),
    postIds.length > 0
      ? supabase.from('comments').select('post_id').eq('post_type', 'community').in('post_id', postIds)
      : Promise.resolve({ data: [] as CommentPostId[] }),
    // Batch the "has the current user reported this post?" lookup that
    // ReportButton would otherwise fire one-at-a-time on mount per
    // visible post (~40-50 calls per page load on a 50-post feed).
    // Detected by Sentry's N+1 heuristic; unblocks performance issue
    // 112707340. Same shape as userLikes — get the user's existing
    // report rows for this batch of post_ids, build a Set, hand it to
    // the client to short-circuit ReportButton's GET.
    postIds.length > 0
      ? supabase.from('reports').select('post_id').eq('post_type', 'community_post').eq('user_id', user.id).in('post_id', postIds)
      : Promise.resolve({ data: [] as ReportPostId[] }),
  ])

  // Build maps
  const profileMap: Record<string, ProfileSummary> = {}
  for (const p of (profiles ?? [])) profileMap[p.id] = p

  const likeCountMap: Record<string, number> = {}
  for (const l of (allLikes ?? [])) likeCountMap[l.post_id] = (likeCountMap[l.post_id] || 0) + 1

  const userLikedArr: string[] = (userLikes ?? []).map((l) => l.post_id)
  const userLikedSet = new Set(userLikedArr)

  const commentCountMap: Record<string, number> = {}
  for (const c of (commentCounts ?? [])) commentCountMap[c.post_id] = (commentCountMap[c.post_id] || 0) + 1

  // List form (not Set) so the prop is JSON-serialisable across the
  // server→client boundary. CommunityClient rebuilds it as a Set.
  const userReportedArr: string[] = (userReports ?? []).map((r) => r.post_id)

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
        userReportedSet={userReportedArr}
        currentUserId={user.id}
      />
      <FAQAccordion items={MODULE_FAQS.community} title="Frequently Asked Questions" subtitle="Common questions about Community" compact />
    </PageShell>
  )
}
