'use client'

import { useState, useEffect } from 'react'

type Props = {
  postId:   string
  // post_type values mirror the likes_post_type_check DB constraint —
  // see supabase/migrations/20260428170000_widen_likes_post_type_check.sql.
  // Keep this union aligned with the constraint and with /api/like.
  postType: 'opportunity' | 'listing' | 'research' | 'community'
  /**
   * Optional SSR-computed seed values. When BOTH are provided the
   * component skips the mount-time GET to /api/like and uses these as
   * initial state — saves a round trip on pages that already SELECT the
   * like row server-side (e.g. /community/[id]). Subsequent toggles
   * still hit the API normally.
   */
  initialLiked?: boolean
  initialCount?: number
}

export default function LikeButton({ postId, postType, initialLiked, initialCount }: Props) {
  // If the caller seeded both values, treat them as authoritative for
  // first paint; the useEffect below stays a no-op so we don't waste a
  // request on data we already have.
  const seeded = initialLiked !== undefined && initialCount !== undefined
  const [liked,       setLiked]       = useState(initialLiked ?? false)
  const [count,       setCount]       = useState(initialCount ?? 0)
  const [loading,     setLoading]     = useState(false)
  const [initialized, setInitialized] = useState(seeded)

  useEffect(() => {
    if (seeded) return
    const init = async () => {
      try {
        const res  = await fetch(`/api/like?postId=${postId}&postType=${postType}`)
        const data = await res.json() as { liked: boolean; count: number }
        setLiked(data.liked)
        setCount(data.count)
      } finally {
        setInitialized(true)
      }
    }
    init()
  }, [postId, postType, seeded])

  const toggle = async () => {
    if (loading || !initialized) return
    setLoading(true)
    // Optimistic update
    setLiked(prev => !prev)
    setCount(prev => liked ? prev - 1 : prev + 1)
    try {
      const res  = await fetch('/api/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, postType }),
      })
      const data = await res.json() as { liked: boolean; count: number; error?: string }
      if (res.ok) {
        setLiked(data.liked)
        setCount(data.count)
      } else {
        // Revert on error
        setLiked(prev => !prev)
        setCount(prev => liked ? prev + 1 : prev - 1)
      }
    } catch {
      setLiked(prev => !prev)
      setCount(prev => liked ? prev + 1 : prev - 1)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading || !initialized}
      aria-label={liked ? 'Unlike' : 'Like'}
      className={`flex items-center gap-1.5 text-sm font-medium transition-colors disabled:opacity-40 ${
        liked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'
      }`}>
      <svg
        aria-hidden="true"
        className="w-4 h-4 transition-all"
        viewBox="0 0 24 24"
        fill={liked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
      {initialized && count > 0 && <span className="text-xs">{count}</span>}
    </button>
  )
}
