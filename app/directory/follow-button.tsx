'use client'
import { useState } from 'react'

type Props = {
  userId: string
  initialIsFollowing: boolean
}

export default function FollowButton({ userId, initialIsFollowing }: Props) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const data = await res.json() as { following: boolean }
      setIsFollowing(data.following)
    } catch (_err) {
      // silently fail — state stays as-is
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors disabled:opacity-50 ${
        isFollowing
          ? 'border-gray-300 text-gray-600 hover:border-red-300 hover:text-red-600 hover:bg-red-50'
          : 'border-green-600 text-green-600 hover:bg-green-600 hover:text-white'
      }`}
    >
      {loading ? '…' : isFollowing ? 'Following' : 'Follow'}
    </button>
  )
}
