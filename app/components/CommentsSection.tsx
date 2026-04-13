'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

type Comment = {
  id: string
  user_id: string
  content: string
  user_name: string | null
  parent_id: string | null
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
  const [comments,    setComments]    = useState<Comment[]>([])
  const [userId,      setUserId]      = useState<string | null>(null)
  const [userName,    setUserName]    = useState('')
  const [content,     setContent]     = useState('')
  const [replyingTo,  setReplyingTo]  = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [loading,     setLoading]     = useState(true)
  const [sortNewest,  setSortNewest]  = useState(true)
  const replyInputRef = useRef<HTMLInputElement>(null)

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
          .select('id, user_id, content, user_name, parent_id, created_at')
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
          .select('id, user_id, content, user_name, parent_id, created_at')
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

  // Focus reply input when replyingTo changes
  useEffect(() => {
    if (replyingTo) {
      replyInputRef.current?.focus()
    }
  }, [replyingTo])

  const toggleCommentLike = async (commentId: string) => {
    if (!userId) return
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
      setComments(prev => prev.map(c =>
        c.id === commentId
          ? { ...c, liked: !c.liked, likeCount: c.liked ? c.likeCount - 1 : c.likeCount + 1 }
          : c
      ))
    }
  }

  const handleSubmit = async (e: React.FormEvent, parentId: string | null = null) => {
    e.preventDefault()
    const text = parentId ? replyContent : content
    if (!text.trim() || !userId) return
    setSubmitting(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('comments')
      .insert({
        user_id:   userId,
        post_id:   postId,
        post_type: postType,
        content:   text.trim(),
        user_name: userName,
        parent_id: parentId,
      })
      .select('id, user_id, content, user_name, parent_id, created_at')
      .single()
    setSubmitting(false)
    if (!error && data) {
      setComments(prev => [...prev, { ...data, likeCount: 0, liked: false }])
      if (parentId) {
        setReplyContent('')
        setReplyingTo(null)
      } else {
        setContent('')
        if (sortNewest) {
          window.scrollTo({
            top: (document.querySelector('.comments-section')?.getBoundingClientRect().top ?? 0) + window.scrollY - 100,
            behavior: 'smooth',
          })
        }
      }
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
    // Remove the comment and any replies to it
    setComments(prev => prev.filter(c => c.id !== id && c.parent_id !== id))
  }

  const initial = (name: string | null) =>
    (name ?? 'U').charAt(0).toUpperCase()

  // Separate top-level comments from replies
  const topLevel = comments.filter(c => !c.parent_id)
  const repliesMap: Record<string, Comment[]> = {}
  for (const c of comments) {
    if (c.parent_id) {
      if (!repliesMap[c.parent_id]) repliesMap[c.parent_id] = []
      repliesMap[c.parent_id].push(c)
    }
  }

  // Sort top-level comments; replies always oldest-first
  const sortedTopLevel = [...topLevel].sort((a, b) => {
    const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    return sortNewest ? -diff : diff
  })

  const totalCount = comments.length

  const renderComment = (comment: Comment, isReply: boolean = false) => (
    <div key={comment.id} className={`flex gap-3 ${isReply ? '' : ''}`}>
      <div className={`${isReply ? 'w-6 h-6' : 'w-8 h-8'} rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0`}>
        <span className={`${isReply ? 'text-[10px]' : 'text-xs'} font-semibold text-green-700 dark:text-green-400`}>
          {initial(comment.user_name)}
        </span>
      </div>
      <div className="flex-1 min-w-0">
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
          {/* Reply button — only on top-level comments, only for logged-in users */}
          {userId && !isReply && (
            <button
              onClick={() => {
                setReplyingTo(replyingTo === comment.id ? null : comment.id)
                setReplyContent('')
              }}
              className="text-xs text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors font-medium"
            >
              Reply
            </button>
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
  )

  return (
    <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 comments-section">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          {'Comments'}{totalCount > 0 && <span className="text-gray-400 dark:text-gray-500 font-normal ml-1">({totalCount})</span>}
        </h2>
        {topLevel.length > 1 && (
          <button
            onClick={() => setSortNewest(prev => !prev)}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors font-medium"
          >
            {sortNewest ? '↓ Newest first' : '↑ Oldest first'}
          </button>
        )}
      </div>

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
      ) : totalCount === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">No comments yet. Be the first to comment.</p>
      ) : (
        <div className="space-y-5 mb-6">
          {sortedTopLevel.map(comment => {
            const replies = repliesMap[comment.id] ?? []

            return (
              <div key={comment.id}>
                {/* Parent comment */}
                {renderComment(comment, false)}

                {/* Replies */}
                {replies.length > 0 && (
                  <div className="ml-10 mt-2 space-y-3 border-l-2 border-gray-100 dark:border-gray-800 pl-4">
                    {replies.map(reply => renderComment(reply, true))}
                  </div>
                )}

                {/* Reply input */}
                {replyingTo === comment.id && userId && (
                  <div className="ml-10 mt-2 pl-4">
                    <form onSubmit={(e) => handleSubmit(e, comment.id)} className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0 mt-1">
                        <span className="text-[10px] font-semibold text-green-700 dark:text-green-400">
                          {initial(userName)}
                        </span>
                      </div>
                      <div className="flex-1 flex gap-2">
                        <input
                          ref={replyInputRef}
                          type="text"
                          value={replyContent}
                          onChange={e => setReplyContent(e.target.value)}
                          placeholder={`Reply to ${comment.user_id === userId ? 'yourself' : (comment.user_name ?? 'User')}...`}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-400 dark:placeholder-gray-500"
                        />
                        <button
                          type="submit"
                          disabled={submitting || !replyContent.trim()}
                          className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          {submitting ? '...' : 'Reply'}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setReplyingTo(null); setReplyContent('') }}
                        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors self-center"
                      >
                        Cancel
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Top-level comment input */}
      {userId ? (
        <form onSubmit={(e) => handleSubmit(e, null)} className="flex gap-3 mt-4">
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
              {submitting ? '...' : 'Post'}
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
