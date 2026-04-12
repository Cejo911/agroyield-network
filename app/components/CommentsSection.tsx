'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Comment = {
  id: string
  user_id: string
  content: string
  user_name: string | null
  created_at: string
  likeCount: number
  liked: boolean
}

type Props = {
  postId: string
  postType: 'research' | 'opportunity' | 'listing' | 'price_report' | 'community'
}

const timeAgo = (dateStr: string) => {
  const diff  = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (hours < 1)  return 'Just now'
  if (hours < 24) return `${hours}h ago`
  if (days < 7)   return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function CommentsSection({ postId, postType }: Props) {
  const [comments,   setComments]   = useState<Comment[]>([])
  const [userId,     setUserId]     = useState<string | null>(null)
  const [userName,   setUserName]   = useState('')
  const [content,    setContent]    = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id)
        const name =
          user.user_metadata?.full_name ??
          user.user_metadata?.name ??
          user.email?.split('@')[0] ??
          'User'
        setUserName(name)

        // Fetch comments then enrich with like data
        supabase
          .from('comments')
          .select('id, user_id, content, user_name, created_at')
          .eq('post_id', postId)
          .eq('post_type', postType)
          .eq('is_active', true)
          .order('created_at', { ascending: true })
          .then(async ({ data: rawComments }) => {
            const commentList = rawComments ?? []
            if (commentList.length === 0) {
              setComments([])
              setLoading(false)
              return
            }
            // Batch fetch likes for all comments
            const commentIds = commentList.map(c => c.id)
            const [{ data: allLikes }, { data: userLikes }] = await Promise.all([
              supabase.from('likes').select('post_id').eq('post_type', 'comment').in('post_id', commentIds),
              supabase.from('likes').select('post_id').eq('post_type', 'comment').eq('user_id', user.id).in('post_id', commentIds),
            ])
            // Count likes per comment
            const countMap: Record<string, number> = {}
            for (const l of (allLikes ?? [])) countMap[l.post_id] = (countMap[l.post_id] || 0) + 1
            const likedSet = new Set((userLikes ?? []).map(l => l.post_id))

            setComments(commentList.map(c => ({
              ...c,
              likeCount: countMap[c.id] || 0,
              liked: likedSet.has(c.id),
            })))
            setLoading(false)
          })
      } else {
        // Not logged in — fetch comments without like data
        supabase
          .from('comments')
          .select('id, user_id, content, user_name, created_at')
          .eq('post_id', postId)
          .eq('post_type', postType)
          .eq('is_active', true)
          .order('created_at', { ascending: true })
          .then(({ data }) => {
            setComments((data ?? []).map(c => ({ ...c, likeCount: 0, liked: false })))
            setLoading(false)
          })
      }
    })
  }, [postId, postType])

  const toggleCommentLike = async (commentId: string) => {
    if (!userId) return
    // Optimistic update
    setComments(prev => prev.map(c =>
      c.id === commentId
        ? { ...c, liked: !c.liked, likeCount: c.liked ? c.likeCount - 1 : c.likeCount + 1 }
        : c
    ))
    try {
      const res = await fetch('/api/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: commentId, postType: 'comment' }),
      })
      if (!res.ok) throw new Error()
    } catch {
      // Revert on error
      setComments(prev => prev.map(c =>
        c.id === commentId
          ? { ...c, liked: !c.liked, likeCount: c.liked ? c.likeCount - 1 : c.likeCount + 1 }
          : c
      ))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || !userId) return
    setSubmitting(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('comments')
      .insert({
        user_id:   userId,
        post_id:   postId,
        post_type: postType,
        content:   content.trim(),
        user_name: userName,
      })
      .select('id, user_id, content, user_name, created_at')
      .single()
    setSubmitting(false)
    if (!error && data) {
      setComments(prev => [...prev, { ...data, likeCount: 0, liked: false }])
      setContent('')
      // Notify post author (fire and forget)
      fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'comment', postId, postType }),
      }).catch(() => {})
    }
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    await supabase.from('comments').update({ is_active: false }).eq('id', id)
    setComments(prev => prev.filter(c => c.id !== id))
  }

  const initial = (name: string | null) =>
    (name ?? 'U').charAt(0).toUpperCase()

  return (
    <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
        {'Comments'}{comments.length > 0 && <span className="text-gray-400 dark:text-gray-500 font-normal ml-1">({comments.length})</span>}
      </h2>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="animate-pulse flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">No comments yet. Be the first to comment.</p>
      ) : (
        <div className="space-y-4 mb-6">
          {comments.map(comment => (
            <div key={comment.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-green-700 dark:text-green-400">
                  {initial(comment.user_name)}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {comment.user_id === userId ? 'You' : (comment.user_name ?? 'User')}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{timeAgo(comment.created_at)}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{comment.content}</p>
                <div className="flex items-center gap-3 mt-1">
                  {userId && (
                    <button
                      onClick={() => toggleCommentLike(comment.id)}
                      className={`text-xs flex items-center gap-1 transition-colors ${
                        comment.liked ? 'text-red-500' : 'text-gray-400 hover:text-red-400 dark:hover:text-red-400'
                      }`}
                    >
                      {comment.liked ? '♥' : '♡'}{comment.likeCount > 0 && ` ${comment.likeCount}`}
                    </button>
                  )}
                  {!userId && comment.likeCount > 0 && (
                    <span className="text-xs text-gray-400">♥ {comment.likeCount}</span>
                  )}
                  {comment.user_id === userId && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {userId ? (
        <form onSubmit={handleSubmit} className="flex gap-3 mt-4">
          <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-green-700 dark:text-green-400">
              {initial(userName)}
            </span>
          </div>
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-400 dark:placeholder-gray-500"
            />
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? '…' : 'Post'}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-4">
          <a href="/login" className="text-green-600 hover:underline">Sign in</a> to leave a comment.
        </p>
      )}
    </div>
  )
}
