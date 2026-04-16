import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import AppNav from '@/app/components/AppNav'
import CommentsSection from '@/app/components/CommentsSection'
import { safeHref } from '@/lib/safe-href'

// ── SEO: generate metadata for public indexing ──
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const adminDb = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: post } = await (adminDb as any)
    .from('community_posts')
    .select('content, post_type, user_id, created_at')
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (!post) return { title: 'Post Not Found — AgroYield Network' }

  // Fetch author name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (adminDb as any)
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', post.user_id)
    .single()

  const authorName = profile
    ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'AgroYield Member'
    : 'AgroYield Member'

  const snippet = post.content.length > 160
    ? post.content.slice(0, 157) + '...'
    : post.content

  const typeLabel = post.post_type.charAt(0).toUpperCase() + post.post_type.slice(1)

  return {
    title: `${typeLabel} by ${authorName} — AgroYield Community`,
    description: snippet,
    openGraph: {
      title: `${typeLabel} by ${authorName} — AgroYield Community`,
      description: snippet,
      type: 'article',
      siteName: 'AgroYield Network',
      publishedTime: post.created_at,
    },
    twitter: {
      card: 'summary',
      title: `${typeLabel} by ${authorName}`,
      description: snippet,
    },
  }
}

export default async function CommunityPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Use service role to read post (works for both anonymous and logged-in users)
  const adminDb = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = adminDb as any

  const { data: post } = await adminAny
    .from('community_posts')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (!post) notFound()

  // Fetch author profile + like data in parallel
  const [{ data: profile }, { data: allLikes }, userLikeResult] = await Promise.all([
    adminAny.from('profiles').select('first_name, last_name, role, avatar_url, username').eq('id', post.user_id).single(),
    adminAny.from('likes').select('post_id').eq('post_type', 'community').eq('post_id', id),
    // Only fetch user's like if logged in
    user
      ? adminAny.from('likes').select('post_id').eq('post_type', 'community').eq('user_id', user.id).eq('post_id', id)
      : Promise.resolve({ data: [] }),
  ])

  const likeCount = (allLikes ?? []).length
  const liked = user ? (userLikeResult.data ?? []).length > 0 : false

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prof = profile as any
  const name = prof ? `${prof.first_name ?? ''} ${prof.last_name ?? ''}`.trim() : 'Anonymous'
  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  const profileHref = prof?.username ? `/u/${prof.username}` : `/directory/${post.user_id}`

  const typeColors: Record<string, string> = {
    discussion: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    question: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
    poll: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
    news: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    milestone: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  }

  const typeIcons: Record<string, string> = {
    discussion: '\u{1F4AC}', question: '\u{2753}', poll: '\u{1F4CA}', news: '\u{1F4F0}', milestone: '\u{1F3C6}',
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  // Poll data
  const votes = post.poll_votes || {}
  const totalVotes = Object.values(votes).reduce((sum: number, arr: unknown) => sum + (Array.isArray(arr) ? arr.length : 0), 0) as number
  const hasVoted = user ? Object.values(votes).some((arr: unknown) => Array.isArray(arr) && arr.includes(user.id)) : false
  const pollClosed = post.poll_closes_at ? new Date(post.poll_closes_at) <= new Date() : false

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <Link href="/community" className="text-sm text-green-600 hover:underline mb-6 inline-block">
          &larr; Back to Community
        </Link>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          {/* Author header */}
          <div className="flex items-start gap-3 mb-4">
            <Link href={profileHref} className="shrink-0">
              {prof?.avatar_url ? (
                <Image src={prof.avatar_url} alt={name} width={48} height={48} className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 font-bold text-sm">
                  {initials}
                </div>
              )}
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Link href={profileHref} className="font-semibold text-gray-900 dark:text-white hover:underline">
                  {name}
                </Link>
                {prof?.role && (
                  <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full capitalize">
                    {prof.role}
                  </span>
                )}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeColors[post.post_type] || typeColors.discussion}`}>
                  {typeIcons[post.post_type]} {post.post_type.charAt(0).toUpperCase() + post.post_type.slice(1)}
                </span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{timeAgo(post.created_at)}</p>
            </div>
            {post.is_pinned && (
              <span className="text-xs text-yellow-600 dark:text-yellow-400 font-semibold">Pinned</span>
            )}
          </div>

          {/* Post content */}
          <p className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line mb-4">
            {post.content}
          </p>

          {/* Image */}
          {post.image_url && (
            <div className="mb-4 rounded-lg overflow-hidden">
              <Image src={post.image_url} alt="Post image" width={800} height={400} sizes="(max-width: 768px) 100vw, 672px" className="w-full max-h-[500px] object-cover" />
            </div>
          )}

          {/* Link preview — href validated to block javascript: and other unsafe protocols */}
          {safeHref(post.link_url) && (
            <a href={safeHref(post.link_url)} target="_blank" rel="noopener noreferrer"
              className="inline-block text-sm text-green-600 hover:underline mb-4 break-all">
              {post.link_url}
            </a>
          )}

          {/* Poll results (read-only on detail page) */}
          {post.post_type === 'poll' && post.poll_options && (
            <div className="space-y-2 mb-4">
              {(post.poll_options as string[]).map((option: string, i: number) => {
                const optVotes = Array.isArray(votes[String(i)]) ? votes[String(i)].length : 0
                const pct = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0
                const userVotedThis = user && Array.isArray(votes[String(i)]) && votes[String(i)].includes(user.id)

                return (
                  <div
                    key={i}
                    className={`relative rounded-lg border px-4 py-2.5 text-sm overflow-hidden ${
                      userVotedThis
                        ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                    }`}
                  >
                    <div className="absolute inset-y-0 left-0 bg-green-100 dark:bg-green-900/30 transition-all" style={{ width: `${pct}%` }} />
                    <div className="relative flex items-center justify-between">
                      <span className={`font-medium ${userVotedThis ? 'text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {option}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{pct}% ({optVotes})</span>
                    </div>
                  </div>
                )
              })}
              <p className="text-xs text-gray-400">
                {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
                {hasVoted ? ' · You voted' : ''}
                {pollClosed && <span className="ml-1 text-red-500 font-medium">· Poll closed</span>}
                {!pollClosed && post.poll_closes_at && (
                  <span className="ml-1">· Closes {new Date(post.poll_closes_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                )}
              </p>
            </div>
          )}

          {/* Like count */}
          <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 pt-3 border-t border-gray-100 dark:border-gray-800">
            <span>{liked ? '\u2665' : '\u2661'}</span>
            <span>{likeCount} like{likeCount !== 1 ? 's' : ''}</span>
          </div>

          {/* Comments section — works for both logged-in and anonymous */}
          <CommentsSection postId={id} postType="community" />
        </div>

        {/* Prompt anonymous users to join */}
        {!user && (
          <div className="mt-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-5 text-center">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
              Join AgroYield Network to like, comment, and participate in the community.
            </p>
            <div className="flex justify-center gap-3">
              <Link href="/login" className="px-4 py-2 text-sm font-medium text-green-700 dark:text-green-400 bg-white dark:bg-gray-900 border border-green-300 dark:border-green-700 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/40 transition-colors">
                Sign In
              </Link>
              <Link href="/signup" className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">
                Join Free
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
