'use client'
import { useState } from 'react'

export default function ApplyButton({
  opportunityId,
  url,
  isExpired,
}: {
  opportunityId: string
  url: string
  isExpired: boolean
}) {
  const [loading, setLoading] = useState(false)

  const handleApply = async () => {
    if (isExpired || loading) return
    setLoading(true)
    try {
      await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunity_id: opportunityId }),
      })
    } catch (e) {
      console.error('Apply notification error:', e)
    } finally {
      setLoading(false)
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  if (isExpired) {
    return (
      <span className="inline-block px-6 py-3 rounded-lg font-semibold text-sm bg-gray-100 text-gray-500 cursor-not-allowed">
        Application closed
      </span>
    )
  }

  return (
    <button
      onClick={handleApply}
      disabled={loading}
      className="inline-block px-6 py-3 rounded-lg font-semibold text-sm bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-60"
    >
      {loading ? 'Opening…' : 'Apply now'}
    </button>
  )
}
