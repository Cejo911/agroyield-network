'use client'
import { useState } from 'react'

interface BuyNowButtonProps {
  listingId: string
  price: number
  sellerHasBank: boolean
}

const formatPrice = (p: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(p)

export default function BuyNowButton({ listingId, price, sellerHasBank }: BuyNowButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!sellerHasBank) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-500 italic">
        Seller hasn&apos;t set up their payout account yet. Contact them directly.
      </p>
    )
  }

  const handleBuy = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/marketplace/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Failed to create order')
        return
      }

      // Redirect to Paystack checkout
      if (data.authorization_url) {
        window.location.href = data.authorization_url
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleBuy}
        disabled={loading}
        className="w-full py-3 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-colors disabled:opacity-50"
      >
        {loading ? 'Processing...' : `Buy Now — ${formatPrice(price)}`}
      </button>
      <p className="text-[11px] text-gray-500 dark:text-gray-500 text-center mt-2">
        Payment held in escrow until you confirm delivery
      </p>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mt-2">{error}</p>
      )}
    </div>
  )
}
