'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import UserAvatar from '@/app/components/design/UserAvatar'
import { formatRelativeTime } from '@/lib/format-time'

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
  const [submitError, setSubmitError] = useState<string | null>(null)
  const replyInputRef = useRef<HTMLTextAreaElement>(null)

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
    setSubmitError(null)

    // Dual-path write.
    //
    // When `comment_mentions_enabled` is ON, /api/comments returns a 200 and
    // handles the mention parse + fan-out + notification emission server-side.
    // When the flag is OFF, /api/comments returns a 404 (opaque by design)
    // and we fall back to the direct Supabase insert — the pre-mentions path
    // that shipped at beta launch. Rollback from "flag on" back to "flag off"
    // is therefore a single feature-flag flip, no client deploy required.
    //
    // Error surface: 400 (too_many_mentions), 429 (rate limit or
    // hourly_cap_exceeded), 401 (not authed) are propagated to the user.
    // We do NOT fall back on those statuses — the user's submit failed and
    // bypassing into the direct insert would silently hide the reason.
    let inserted:
      | { id: string; user_id: string; content: string; user_name: string | null; parent_id: string | null; created_at: string }
      | null = null

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: postId,
          post_type: postType,
          content: text.trim(),
          user_name: userName,
          parent_id: parentId,
        }),
      })

      if (res.ok) {
        const payload = await res.json()
        inserted = payload.comment
      } else if (res.status === 404) {
        // Feature flag off — fall through to direct-insert branch below.
      } else {
        const err = await res.json().catch(() => ({} as { error?: string; count?: number }))
        const reason = typeof err.error === 'string' ? err.error : ''
        if (reason === 'too_many_mentions') {
          setSubmitError('You can only @mention up to 5 people per comment.')
        } else if (reason === 'hourly_cap_exceeded') {
          setSubmitError('You\u2019ve hit the hourly @mention limit. Try again in a bit.')
        } else if (res.status === 429) {
          setSubmitError('Too many comments in a short time. Try again shortly.')
        } else if (res.status === 401) {
          setSubmitError('Your session expired. Please sign in again.')
        } else {
          setSubmitError('Failed to post comment. Please try again.')
        }
        setSubmitting(false)
        return
      }
    } catch {
      // Network error calling the endpoint. Don't fall back silently either —
      // if the user's offline, the direct-insert path from the browser won't
      // work either, and we'd prefer a clear error to a misleading retry.
      setSubmitError('Network error. Please check your connection and retry.')
      setSubmitting(false)
      return
    }

    // Fall-back: direct Supabase insert (flag-off path).
    if (!inserted) {
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
      if (error || !data) {
        setSubmitError('Failed to post comment. Please try again.')
        setSubmitting(false)
        return
      }
      inserted = data
    }

    setSubmitting(false)
    setComments(prev => [...prev, { ...inserted!, likeCount: 0, liked: false }])
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

    // Notify post author (fire and forget). This is the "someone commented on
    // your post" notification and is separate from the mention fan-out, which
    // /api/comments handles server-side. Always fire, regardless of path.
    fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'comment', postId, postType }),
    }).catch(() => {})
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    await supabase.from('comments').update({ is_active: false }).eq('id', id)
    // Remove the comment and any replies to it
    setComments(prev => prev.filter(c => c.id !== id && c.parent_id !== id))
  }

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
      <UserAvatar name={comment.user_name} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            {comment.user_id === userId ? 'You' : (comment.user_name ?? 'User')}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{formatRelativeTime(comment.created_at)}</span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">{comment.content}</p>
        <div className="flex items-center gap-3 mt-1">
          {userId && (
            <button
              onClick={() => toggleCommentLike(comment.id)}
              className={`text-xs flex items-center gap-1 transition-colors ${
                comment.liked ? 'text-red-500' : 'text-gray-500 dark:text-gray-400 hover:text-red-400 dark:hover:text-red-400'
              }`}
            >
              {comment.liked ? '♥' : '♡'}{comment.likeCount > 0 && ` ${comment.likeCount}`}
            </button>
          )}
          {!userId && comment.likeCount > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">♥ {comment.likeCount}</span>
          )}
          {/* Reply button — only on top-level comments, only for logged-in users */}
          {userId && !isReply && (
            <button
              onClick={() => {
                setReplyingTo(replyingTo === comment.id ? null : comment.id)
                setReplyContent('')
              }}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors font-medium"
            >
              Reply
            </button>
          )}
          {comment.user_id === userId && (
            <button
              onClick={() => handleDelete(comment.id)}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
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
                      <UserAvatar name={userName} size="sm" className="mt-1" />
                      <div className="flex-1 flex gap-2">
                        <textarea
                          ref={replyInputRef}
                          rows={2}
                          value={replyContent}
                          onChange={e => setReplyContent(e.target.value)}
                          onKeyDown={e => {
                            // Cmd/Ctrl+Enter submits; plain Enter inserts a newline.
                            // Matches LinkedIn / Twitter comment composer behavior.
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                              e.preventDefault()
                              if (replyContent.trim() && !submitting) {
                                handleSubmit(e as unknown as React.FormEvent, comment.id)
                              }
                            }
                          }}
                          placeholder={`Reply to ${comment.user_id === userId ? 'yourself' : (comment.user_name ?? 'User')}…  (\u2318+Enter to send)`}
                          className="flex-1 resize-none px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-400 dark:placeholder-gray-500"
                        />
                        <button
                          type="submit"
                          disabled={submitting || !replyContent.trim()}
                          className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 disabled:opacity-50 transition-colors min-w-[60px] self-start"
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

      {/* Submit error banner — shown for rate limits, mention caps, etc.
          Clears automatically on next submit attempt. */}
      {submitError && (
        <div
          role="alert"
          className="mt-4 mb-2 flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-700 dark:text-red-300"
        >
          <span className="flex-1">{submitError}</span>
          <button
            type="button"
            onClick={() => setSubmitError(null)}
            className="text-red-400 hover:text-red-600 dark:hover:text-red-200 transition-colors font-semibold"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Top-level comment input */}
      {userId ? (
        <form onSubmit={(e) => handleSubmit(e, null)} className="flex gap-3 mt-4">
          <UserAvatar name={userName} size="sm" />
          <div className="flex-1 flex gap-2">
            <textarea
              rows={2}
              value={content}
              onChange={e => setContent(e.target.value)}
              onKeyDown={e => {
                // Cmd/Ctrl+Enter submits; plain Enter inserts a newline.
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  if (content.trim() && !submitting) {
                    handleSubmit(e as unknown as React.FormEvent, null)
                  }
                }
              }}
              placeholder="Write a comment…  (\u2318+Enter to send)"
              className="flex-1 resize-none px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-400 dark:placeholder-gray-500"
            />
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors min-w-[68px] self-start"
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
