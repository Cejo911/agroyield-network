'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Order {
  id: string
  listing_id: string
  buyer_id: string
  seller_id: string
  amount: number
  commission: number
  seller_amount: number
  status: string
  payment_status: string
  created_at: string
  marketplace_listings: { title: string; image_urls: string[]; category: string } | null
}

const STATUS_COLOURS: Record<string, string> = {
  pending_payment: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  paid:            'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  shipped:         'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  completed:       'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  disputed:        'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  refunded:        'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  cancelled:       'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
}

const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Pending Payment',
  paid: 'Paid',
  shipped: 'Shipped',
  completed: 'Completed',
  disputed: 'Disputed',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(price)

export default function OrdersList({ userId }: { userId: string }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<'all' | 'buyer' | 'seller'>('all')

  useEffect(() => {
    // setLoading(true) at the start of the fetch effect resets the spinner
    // when role changes. Async setOrders happens in .then(); rule suppress.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    fetch(`/api/marketplace/orders?role=${role}`)
      .then(r => r.json())
      .then(data => setOrders(data.orders ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [role])

  return (
    <div>
      {/* Role toggle */}
      <div className="flex gap-2 mb-5">
        {(['all', 'buyer', 'seller'] as const).map(r => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={`text-sm px-4 py-1.5 rounded-full font-medium transition-colors ${
              role === r
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {r === 'all' ? 'All Orders' : r === 'buyer' ? 'My Purchases' : 'My Sales'}
          </button>
        ))}
      </div>

      {loading && (
        <div className="py-8 text-center text-sm text-gray-400">Loading orders...</div>
      )}

      {!loading && orders.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-3">No orders yet</p>
          <Link
            href="/marketplace"
            className="text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400"
          >
            Browse marketplace
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {orders.map(order => {
          const isBuyer = order.buyer_id === userId
          const listing = order.marketplace_listings
          const thumb = listing?.image_urls?.[0]

          return (
            <Link
              key={order.id}
              href={`/marketplace/orders/${order.id}`}
              className="block bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 hover:border-green-300 dark:hover:border-green-700 transition-colors"
            >
              <div className="flex items-center gap-4">
                {/* Thumbnail */}
                <div className="w-14 h-14 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                  {thumb ? (
                    <img src={thumb} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg">
                      📦
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 dark:text-gray-100 truncate text-sm">
                      {listing?.title ?? 'Listing'}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLOURS[order.status] ?? STATUS_COLOURS.pending_payment}`}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {isBuyer ? 'You bought' : 'You sold'} &middot;{' '}
                    {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>

                {/* Amount */}
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {formatPrice(isBuyer ? order.amount : order.seller_amount)}
                  </p>
                  {!isBuyer && order.commission > 0 && (
                    <p className="text-[10px] text-gray-400">-{formatPrice(order.commission)} fee</p>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
