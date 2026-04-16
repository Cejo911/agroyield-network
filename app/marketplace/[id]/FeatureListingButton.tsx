'use client'
import { useState, useEffect } from 'react'

interface Plan {
  days: number
  price: number
  label: string
}

interface FeatureListingButtonProps {
  listingId: string
  isFeatured: boolean
  featuredUntil: string | null
}

const formatPrice = (p: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(p)

export default function FeatureListingButton({ listingId, isFeatured, featuredUntil }: FeatureListingButtonProps) {
  const [plans, setPlans] = useState<Plan[]>([])
  const [selectedDays, setSelectedDays] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPlans, setShowPlans] = useState(false)
  const [error, setError] = useState('')

  const stillFeatured = isFeatured && featuredUntil && new Date(featuredUntil) > new Date()

  // Fetch plans on expand
  useEffect(() => {
    if (showPlans && plans.length === 0) {
      fetch('/api/marketplace/feature')
        .then(r => r.json())
        .then(data => {
          setPlans(data.plans ?? [])
          if (data.plans?.length > 0) setSelectedDays(data.plans[0].days)
        })
        .catch(() => {})
    }
  }, [showPlans, plans.length])

  const handleFeature = async () => {
    if (!selectedDays) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/marketplace/feature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId, days: selectedDays }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed'); return }
      if (data.authorization_url) window.location.href = data.authorization_url
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
      {/* Current featured status */}
      {stillFeatured && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <span className="text-xs font-bold text-amber-700 dark:text-amber-400">FEATURED</span>
          <span className="text-xs text-amber-600 dark:text-amber-500">
            until {new Date(featuredUntil!).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
      )}

      <button
        onClick={() => setShowPlans(!showPlans)}
        className="text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
      >
        {stillFeatured ? 'Extend featured period' : 'Promote this listing'}
      </button>

      {showPlans && (
        <div className="mt-3 p-4 rounded-xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
            {stillFeatured ? 'Add more days' : 'Feature your listing'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Featured listings appear at the top of search results with a highlighted badge.
            {stillFeatured && ' Additional days will be added to your existing featured period.'}
          </p>

          <div className="flex gap-2 mb-3">
            {plans.map(plan => (
              <button
                key={plan.days}
                onClick={() => setSelectedDays(plan.days)}
                className={`flex-1 py-2 rounded-lg text-center text-sm font-medium transition-colors ${
                  selectedDays === plan.days
                    ? 'bg-amber-500 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-600'
                }`}
              >
                <span className="block font-bold">{plan.label}</span>
                <span className="block text-xs mt-0.5 opacity-80">{formatPrice(plan.price)}</span>
              </button>
            ))}
          </div>

          {error && <p className="text-xs text-red-600 dark:text-red-400 mb-2">{error}</p>}

          <button
            onClick={handleFeature}
            disabled={loading || !selectedDays}
            className="w-full py-2.5 rounded-lg bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : `Pay ${selectedDays ? formatPrice(plans.find(p => p.days === selectedDays)?.price ?? 0) : ''}`}
          </button>
        </div>
      )}
    </div>
  )
}
