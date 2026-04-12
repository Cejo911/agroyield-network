'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const POST_TYPES = [
  { value: 'all',        label: 'All',         icon: '' },
  { value: 'discussion', label: 'Discussion',  icon: '💬' },
  { value: 'question',   label: 'Question',    icon: '❓' },
  { value: 'poll',       label: 'Poll',        icon: '📊' },
  { value: 'news',       label: 'News',        icon: '📰' },
  { value: 'milestone',  label: 'Milestone',   icon: '🏆' },
]

const typeIcons: Record<string, string> = {
  discussion: '💬',
  question: '❓',
  poll: '📊',
  news: '📰',
  milestone: '🏆',
}

const typeColors: Record<string, string> = {
  discussion: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  question: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  poll: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  news: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  milestone: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
}

interface Props {
  posts: any[]
  profileMap: Record<string, any>
  likeCountMap: Record<string, number>
  userLikedSet: string[]
  commentCountMap: Record<string, number>
  currentUserId: string
}

export default function CommunityClient({ posts, profileMap, likeCountMap, userLikedSet: initialLiked, commentCountMap, currentUserId }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [postType, setPostType] = useState('discussion')
  const [content, setContent] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [pollOptions, setPollOptions] = useState(['', ''])
  const [posting, setPosting] = useState(false)
  const [likedSet, setLikedSet] = useState(new Set(initialLiked))
  const [likeCounts, setLikeCounts] = useState(likeCountMap)
  const [pollVotesLocal, setPollVotesLocal] = useState<Record<string, any>>({})

  const filtered = filter === 'all' ? posts : posts.filter(p => p.post_type === filter)

  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setPosting(true)

    const payload: any = {
      user_id: currentUserId,
      post_type: postType,
      content: content.trim(),
      link_url: linkUrl.trim() || null,
    }

    if (postType === 'poll') {
      const opts = pollOptions.map(o => o.trim()).filter(Boolean)
      if (opts.length < 2) {
        alert('Please provide at least 2 poll options.')
        setPosting(false)
        return
      }
      payload.poll_options = opts
      payload.poll_votes = {}
    }

    const { error } = await (supabase as any).from('community_posts').insert(payload)
    setPosting(false)

    if (error) {
      alert(`Error: ${error.message}`)
      return
    }

    setContent('')
    setLinkUrl('')
    setPollOptions(['', ''])
    setPostType('discussion')
    setShowForm(false)
    router.refresh()
  }

  async function toggleLike(postId: string) {
    const res = await fetch('/api/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, postType: 'community' }),
    })
    const data = await res.json()
    setLikedSet(prev => {
      const next = new Set(prev)
      data.liked ? next.add(postId) : next.delete(postId)
      return next
    })
    setLikeCounts(prev => ({ ...prev, [postId]: data.count }))
  }

  async function votePoll(postId: string, optionIndex: number) {
    const res = await fetch('/api/community/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, optionIndex }),
    })
    const data = await res.json()
    if (data.poll_votes) {
      setPollVotesLocal(prev => ({ ...prev, [postId]: data.poll_votes }))
    }
  }

  async function deletePost(postId: string) {
    if (!confirm('Delete this post?')) return
    await (supabase as any).from('community_posts').update({ is_active: false }).eq('id', postId)
    router.refresh()
  }

  function timeAgo(date: string): string {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (seconds < 60) return 'just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
  }

  return (
    <div>
      {/* New post button */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-left text-gray-400 dark:text-gray-500 hover:border-green-300 dark:hover:border-green-700 transition-colors mb-6 text-sm"
        >
          What&apos;s on your mind? Share with the community...
        </button>
      ) : (
        <form onSubmit={handlePost} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 mb-6 space-y-4">
          {/* Post type selector */}
          <div className="flex gap-2 flex-wrap">
            {POST_TYPES.filter(t => t.value !== 'all').map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setPostType(t.value)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  postType === t.value
                    ? 'bg-green-600 text-white border-green-600'
                    : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-green-400'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={4}
            placeholder={
              postType === 'question' ? 'Ask the community a question...' :
              postType === 'milestone' ? 'Share your achievement...' :
              postType === 'news' ? 'Share a news story or article...' :
              postType === 'poll' ? 'What do you want to ask?' :
              'Share your thoughts...'
            }
            className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            required
          />

          {/* Link URL for news */}
          {postType === 'news' && (
            <input
              type="url"
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              placeholder="Paste article URL (optional)"
              className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          )}

          {/* Poll options */}
          {postType === 'poll' && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Poll Options</p>
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={opt}
                    onChange={e => {
                      const next = [...pollOptions]
                      next[i] = e.target.value
                      setPollOptions(next)
                    }}
                    placeholder={`Option ${i + 1}`}
                    className="flex-1 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  {pollOptions.length > 2 && (
                    <button type="button" onClick={() => setPollOptions(prev => prev.filter((_, j) => j !== i))}
                      className="text-gray-400 hover:text-red-500 text-sm px-2">✕</button>
                  )}
                </div>
              ))}
              {pollOptions.length < 6 && (
                <button type="button" onClick={() => setPollOptions(prev => [...prev, ''])}
                  className="text-xs text-green-600 hover:underline font-medium">+ Add option</button>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button type="button" onClick={() => { setPostType('discussion'); setShowForm(false) }}
              className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium py-2 rounded-lg">
              Cancel
            </button>
            <button type="submit" disabled={posting || !content.trim()}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2 rounded-lg disabled:opacity-50 transition-colors">
              {posting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-6">
        {POST_TYPES.map(t => (
          <button
            key={t.value}
            onClick={() => setFilter(t.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filter === t.value
                ? 'bg-green-600 text-white border-green-600'
                : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-green-400'
            }`}
          >
            {t.value === 'all' ? 'All' : `${t.icon} ${t.label}`}
          </button>
        ))}
      </div>

      {/* Posts */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-4xl mb-3">🌾</p>
          <p className="font-medium">No posts yet</p>
          <p className="text-sm mt-1">Be the first to share something with the community!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(post => {
            const profile = profileMap[post.user_id]
            const name = profile ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() : 'Anonymous'
            const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
            const profileHref = profile?.username ? `/u/${profile.username}` : `/directory/${post.user_id}`
            const liked = likedSet.has(post.id)
            const likeCount = likeCounts[post.id] || 0
            const commentCount = commentCountMap[post.id] || 0
            const votes = pollVotesLocal[post.id] || post.poll_votes || {}
            const totalVotes = Object.values(votes).reduce((sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0), 0) as number
            const hasVoted = Object.values(votes).some((arr: any) => Array.isArray(arr) && arr.includes(currentUserId))

            return (
              <div key={post.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  <Link href={profileHref} className="shrink-0">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt={name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 font-bold text-sm">
                        {initials}
                      </div>
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={profileHref} className="font-semibold text-gray-900 dark:text-white text-sm hover:underline">
                        {name}
                      </Link>
                      {profile?.role && (
                        <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full capitalize">
                          {profile.role}
                        </span>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeColors[post.post_type] || typeColors.discussion}`}>
                        {typeIcons[post.post_type]} {post.post_type.charAt(0).toUpperCase() + post.post_type.slice(1)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{timeAgo(post.created_at)}</p>
                  </div>
                  {post.is_pinned && (
                    <span className="text-xs text-yellow-600 dark:text-yellow-400 font-semibold">📌 Pinned</span>
                  )}
                  {post.user_id === currentUserId && (
                    <button onClick={() => deletePost(post.id)} className="text-gray-300 hover:text-red-500 text-xs">✕</button>
                  )}
                </div>

                {/* Content */}
                <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line mb-3">
                  {post.content}
                </p>

                {/* Link */}
                {post.link_url && (
                  <a href={post.link_url} target="_blank" rel="noopener noreferrer"
                    className="inline-block text-sm text-green-600 hover:underline mb-3 break-all">
                    🔗 {post.link_url.replace(/^https?:\/\//, '').slice(0, 60)}...
                  </a>
                )}

                {/* Poll */}
                {post.post_type === 'poll' && post.poll_options && (
                  <div className="space-y-2 mb-3">
                    {(post.poll_options as string[]).map((option: string, i: number) => {
                      const optVotes = Array.isArray(votes[String(i)]) ? votes[String(i)].length : 0
                      const pct = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0
                      const userVotedThis = Array.isArray(votes[String(i)]) && votes[String(i)].includes(currentUserId)

                      return (
                        <button
                          key={i}
                          onClick={() => !hasVoted && votePoll(post.id, i)}
                          disabled={hasVoted}
                          className={`w-full text-left relative rounded-lg border px-4 py-2.5 text-sm transition-colors overflow-hidden ${
                            userVotedThis
                              ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/20'
                              : hasVoted
                                ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                                : 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 cursor-pointer'
                          }`}
                        >
                          {hasVoted && (
                            <div className="absolute inset-y-0 left-0 bg-green-100 dark:bg-green-900/30 transition-all" style={{ width: `${pct}%` }} />
                          )}
                          <div className="relative flex items-center justify-between">
                            <span className={`font-medium ${userVotedThis ? 'text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                              {option}
                            </span>
                            {hasVoted && <span className="text-xs text-gray-500 dark:text-gray-400">{pct}%</span>}
                          </div>
                        </button>
                      )
                    })}
                    <p className="text-xs text-gray-400">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-5 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => toggleLike(post.id)}
                    className={`flex items-center gap-1.5 text-sm transition-colors ${
                      liked ? 'text-red-500' : 'text-gray-400 dark:text-gray-500 hover:text-red-500'
                    }`}
                  >
                    <span>{liked ? '♥' : '♡'}</span>
                    <span>{likeCount > 0 ? likeCount : ''}</span>
                  </button>
                  <Link
                    href={`/community/${post.id}`}
                    className="flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500 hover:text-green-600 transition-colors"
                  >
                    <span>💬</span>
                    <span>{commentCount > 0 ? commentCount : ''}</span>
                    <span className="text-xs">Comment</span>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
