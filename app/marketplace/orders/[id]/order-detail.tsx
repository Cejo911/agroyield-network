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
  paystack_reference: string | null
  payment_status: string
  status: string
  shipped_at: string | null
  delivery_deadline: string | null
  confirmed_at: string | null
  released_at: string | null
  cancelled_at: string | null
  created_at: string
  marketplace_listings: {
    title: string
    image_urls: string[]
    category: string
    type: string
    state: string
  } | null
}

interface Dispute {
  id: string
  reason: string
  description: string | null
  status: string
  resolution: string | null
  created_at: string
}

interface Profile {
  first_name: string
  last_name: string
  username: string
  email: string
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
  paid: 'Paid — Awaiting Shipment',
  shipped: 'Shipped — Awaiting Confirmation',
  completed: 'Completed',
  disputed: 'Disputed',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
}

const formatPrice = (p: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(p)

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function OrderDetail({ orderId, userId }: { orderId: string; userId: string }) {
  const [order, setOrder] = useState<Order | null>(null)
  const [dispute, setDispute] = useState<Dispute | null>(null)
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState('')
  const [error, setError] = useState('')
  const [disputeForm, setDisputeForm] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [disputeDesc, setDisputeDesc] = useState('')

  const fetchOrder = () => {
    fetch(`/api/marketplace/orders/${orderId}`)
      .then(r => r.json())
      .then(data => {
        setOrder(data.order)
        setDispute(data.dispute)
        setProfiles(data.profiles ?? {})
        setIsAdmin(data.isAdmin ?? false)
      })
      .catch(() => setError('Failed to load order'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchOrder() }, [orderId])

  const doAction = async (action: string) => {
    setActionLoading(action)
    setError('')
    try {
      const res = await fetch(`/api/marketplace/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      fetchOrder()
    } catch {
      setError('Action failed')
    } finally {
      setActionLoading('')
    }
  }

  const raiseDispute = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!disputeReason.trim()) return
    setActionLoading('dispute')
    setError('')
    try {
      const res = await fetch(`/api/marketplace/orders/${orderId}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: disputeReason, description: disputeDesc }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setDisputeForm(false)
      fetchOrder()
    } catch {
      setError('Failed to raise dispute')
    } finally {
      setActionLoading('')
    }
  }

  if (loading) return <div className="py-8 text-center text-sm text-gray-400">Loading...</div>
  if (!order) return <div className="py-8 text-center text-sm text-red-500">Order not found</div>

  const isBuyer = order.buyer_id === userId
  const isSeller = order.seller_id === userId
  const listing = order.marketplace_listings
  const getName = (id: string) => {
    const p = profiles[id]
    if (!p) return 'User'
    if (p.first_name) return `${p.first_name} ${p.last_name ?? ''}`.trim()
    return p.username || p.email || 'User'
  }

  return (
    <div>
      <Link href="/marketplace/orders" className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 mb-4 transition-colors">
        &larr; Back to Orders
      </Link>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              {listing?.title ?? 'Order'}
            </h1>
            <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full ${STATUS_COLOURS[order.status]}`}>
              {STATUS_LABELS[order.status] ?? order.status}
            </span>
          </div>
          {listing?.image_urls?.[0] && (
            <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800">
              <img src={listing.image_urls[0]} alt="" className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        {/* Amounts */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Amount</p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatPrice(order.amount)}</p>
          </div>
          {isSeller && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Your Payout</p>
              <p className="text-lg font-bold text-green-700 dark:text-green-400">{formatPrice(order.seller_amount)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{formatPrice(order.commission)} platform fee (3%)</p>
            </div>
          )}
          {isBuyer && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{isBuyer ? 'Seller' : 'Buyer'}</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {getName(order.seller_id)}
              </p>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <p>📋 Created: {formatDate(order.created_at)}</p>
          {order.shipped_at && <p>📦 Shipped: {formatDate(order.shipped_at)}</p>}
          {order.delivery_deadline && order.status === 'shipped' && (
            <p>⏰ Auto-release: {formatDate(order.delivery_deadline)}</p>
          )}
          {order.confirmed_at && <p>✅ Confirmed: {formatDate(order.confirmed_at)}</p>}
          {order.released_at && <p>💰 Funds released: {formatDate(order.released_at)}</p>}
          {order.cancelled_at && <p>❌ Cancelled: {formatDate(order.cancelled_at)}</p>}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mb-6">
          {/* Seller: mark shipped */}
          {isSeller && order.status === 'paid' && (
            <button
              onClick={() => doAction('ship')}
              disabled={!!actionLoading}
              className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
            >
              {actionLoading === 'ship' ? 'Marking...' : 'Mark as Shipped'}
            </button>
          )}

          {/* Buyer: confirm delivery */}
          {isBuyer && order.status === 'shipped' && (
            <button
              onClick={() => doAction('confirm')}
              disabled={!!actionLoading}
              className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
            >
              {actionLoading === 'confirm' ? 'Confirming...' : 'Confirm Delivery'}
            </button>
          )}

          {/* Cancel */}
          {(isBuyer || isSeller) && ['pending_payment', 'paid'].includes(order.status) && (
            <button
              onClick={() => doAction('cancel')}
              disabled={!!actionLoading}
              className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              {actionLoading === 'cancel' ? 'Cancelling...' : 'Cancel Order'}
            </button>
          )}

          {/* Raise dispute */}
          {(isBuyer || isSeller) && ['paid', 'shipped'].includes(order.status) && !dispute && (
            <button
              onClick={() => setDisputeForm(true)}
              className="px-4 py-2 rounded-lg text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              Raise Dispute
            </button>
          )}

          {/* Admin actions */}
          {isAdmin && ['shipped', 'disputed'].includes(order.status) && (
            <>
              <button
                onClick={() => doAction('admin_release')}
                disabled={!!actionLoading}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading === 'admin_release' ? 'Releasing...' : 'Release Funds (Admin)'}
              </button>
              <button
                onClick={() => doAction('admin_refund')}
                disabled={!!actionLoading}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading === 'admin_refund' ? 'Refunding...' : 'Refund Buyer (Admin)'}
              </button>
            </>
          )}
        </div>

        {/* Dispute form */}
        {disputeForm && (
          <form onSubmit={raiseDispute} className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-3">Raise a Dispute</p>
            <input
              type="text"
              placeholder="Reason (e.g. item not as described)"
              value={disputeReason}
              onChange={e => setDisputeReason(e.target.value)}
              required
              className="w-full mb-2 px-3 py-2 rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <textarea
              placeholder="Description (optional)"
              value={disputeDesc}
              onChange={e => setDisputeDesc(e.target.value)}
              rows={3}
              className="w-full mb-3 px-3 py-2 rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={actionLoading === 'dispute'}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading === 'dispute' ? 'Submitting...' : 'Submit Dispute'}
              </button>
              <button
                type="button"
                onClick={() => setDisputeForm(false)}
                className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Existing dispute */}
        {dispute && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">Dispute</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                {dispute.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-1"><strong>Reason:</strong> {dispute.reason}</p>
            {dispute.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{dispute.description}</p>
            )}
            {dispute.resolution && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                <strong>Resolution:</strong> {dispute.resolution}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-2">Raised {formatDate(dispute.created_at)}</p>
          </div>
        )}

        {/* Listing link */}
        {order.listing_id && (
          <Link
            href={`/marketplace/${order.listing_id}`}
            className="text-sm text-green-600 hover:text-green-700 dark:text-green-400 font-medium"
          >
            View original listing &rarr;
          </Link>
        )}
      </div>
    </div>
  )
}
