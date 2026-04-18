'use client'

import { useState } from 'react'

/**
 * WriteReviewButton — button + modal for logged-in non-owners to post a review
 * on /b/{slug}. POSTs to /api/business-reviews.
 *
 * The parent server component decides whether to render this (authed && !owner
 * && !already_reviewed). The button itself only handles the modal UX.
 */

type Props = {
  businessId:   string
  businessName: string
}

const MAX_HEADLINE = 150
const MAX_BODY = 4000

export default function WriteReviewButton({ businessId, businessName }: Props) {
  const [open, setOpen]         = useState(false)
  const [rating, setRating]     = useState<number>(0)
  const [hover, setHover]       = useState<number>(0)
  const [headline, setHeadline] = useState('')
  const [body, setBody]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const reset = () => {
    setRating(0); setHover(0); setHeadline(''); setBody('')
    setError(null); setLoading(false)
  }

  const submit = async () => {
    if (loading) return
    if (rating < 1 || rating > 5) {
      setError('Please pick a star rating')
      return
    }
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/business-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          rating,
          headline: headline.trim() || null,
          body:     body.trim()     || null,
        }),
      })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Failed to submit review')
        setLoading(false)
        return
      }
      // Success — close modal and refresh to show the new review.
      setOpen(false)
      reset()
      if (typeof window !== 'undefined') window.location.reload()
    } catch {
      setError('Network error — try again')
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
      >
        Write a review
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => { if (!loading) { setOpen(false); reset() } }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              Review {businessName}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Help other members. Your review will be public.
            </p>

            {/* Star picker */}
            <div className="flex items-center gap-1 mb-4" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((n) => {
                const filled = (hover || rating) >= n
                return (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={rating === n}
                    aria-label={`${n} star${n > 1 ? 's' : ''}`}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => setRating(n)}
                    className="p-1 text-3xl leading-none transition-colors"
                    style={{ color: filled ? '#f59e0b' : '#d1d5db' }}
                  >
                    ★
                  </button>
                )
              })}
            </div>

            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Headline <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value.slice(0, MAX_HEADLINE))}
              maxLength={MAX_HEADLINE}
              placeholder="Quick delivery, fair prices"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-green-500"
            />

            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Review <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, MAX_BODY))}
              maxLength={MAX_BODY}
              rows={4}
              placeholder={`Share your experience with ${businessName}…`}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-1 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <p className="text-[11px] text-gray-400 text-right mb-3">
              {body.length}/{MAX_BODY}
            </p>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { if (!loading) { setOpen(false); reset() } }}
                disabled={loading}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={loading || rating < 1}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting…' : 'Submit review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
