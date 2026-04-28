'use client'
import { useState, useEffect } from 'react'

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
  paystack_reference: string | null
  created_at: string
  marketplace_listings: { title: string } | null
}

interface Dispute {
  id: string
  order_id: string
  raised_by: string
  reason: string
  status: string
  created_at: string
}

interface OrdersTabProps {
  profilesMap: Record<string, { first_name: string | null; last_name: string | null; email: string | null; username: string | null }>
  getDisplayName: (userId: string) => string
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

const formatPrice = (p: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(p)

export default function OrdersTab({ getDisplayName }: OrdersTabProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [actionLoading, setActionLoading] = useState('')
  const [resolveOrderId, setResolveOrderId] = useState<string | null>(null)
  const [resolveNotes, setResolveNotes] = useState('')

  useEffect(() => {
    // Fetch all orders and disputes as admin
    Promise.all([
      fetch('/api/admin/marketplace-orders').then(r => r.json()),
    ])
      .then(([data]) => {
        setOrders(data.orders ?? [])
        setDisputes(data.disputes ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = orders.filter(o => statusFilter === 'all' || o.status === statusFilter)

  const activeOrders = orders.filter(o => ['paid', 'shipped'].includes(o.status)).length
  const disputedOrders = orders.filter(o => o.status === 'disputed').length
  const totalRevenue = orders
    .filter(o => o.payment_status === 'released')
    .reduce((sum, o) => sum + o.commission, 0)

  const doAction = async (orderId: string, action: string) => {
    setActionLoading(`${orderId}-${action}`)
    try {
      const res = await fetch(`/api/marketplace/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) window.location.reload()
    } catch (err) {
      console.error('Action failed:', err)
    } finally {
      setActionLoading('')
    }
  }

  const resolveDispute = async (orderId: string, resolution: string) => {
    setActionLoading(`${orderId}-resolve`)
    try {
      const res = await fetch(`/api/marketplace/orders/${orderId}/dispute`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution, notes: resolveNotes }),
      })
      if (res.ok) window.location.reload()
    } catch (err) {
      console.error('Resolve failed:', err)
    } finally {
      setActionLoading('')
      setResolveOrderId(null)
    }
  }

  if (loading) return <div className="py-8 text-center text-sm text-gray-400">Loading orders...</div>

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{activeOrders}</p>
          <p className="text-xs text-blue-600 dark:text-blue-500">Active</p>
        </div>
        <div className={`${disputedOrders > 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'} border rounded-lg p-3 text-center`}>
          <p className={`text-xl font-bold ${disputedOrders > 0 ? 'text-red-700 dark:text-red-400' : 'text-gray-500'}`}>{disputedOrders}</p>
          <p className={`text-xs ${disputedOrders > 0 ? 'text-red-600 dark:text-red-500' : 'text-gray-500'}`}>Disputed</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-green-700 dark:text-green-400">{formatPrice(totalRevenue)}</p>
          <p className="text-xs text-green-600 dark:text-green-500">Commission Earned</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
        >
          <option value="all">All ({orders.length})</option>
          <option value="paid">Paid</option>
          <option value="shipped">Shipped</option>
          <option value="disputed">Disputed</option>
          <option value="completed">Completed</option>
          <option value="refunded">Refunded</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Orders list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">No orders match your filter.</p>
        )}
        {filtered.map(order => {
          const dispute = disputes.find(d => d.order_id === order.id)
          return (
            <div key={order.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
                      {order.marketplace_listings?.title ?? 'Listing'}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLOURS[order.status]}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Buyer: {getDisplayName(order.buyer_id)} &middot; Seller: {getDisplayName(order.seller_id)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatPrice(order.amount)} total &middot; {formatPrice(order.commission)} fee &middot;{' '}
                    {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </p>

                  {/* Dispute info */}
                  {dispute && (
                    <div className="mt-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
                      <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-0.5">
                        Dispute — {dispute.status.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{dispute.reason}</p>
                    </div>
                  )}
                </div>

                {/* Admin actions */}
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  {['shipped', 'disputed'].includes(order.status) && (
                    <button
                      onClick={() => doAction(order.id, 'admin_release')}
                      disabled={!!actionLoading}
                      className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      {actionLoading === `${order.id}-admin_release` ? '...' : 'Release'}
                    </button>
                  )}
                  {['paid', 'shipped', 'disputed'].includes(order.status) && (
                    <button
                      onClick={() => doAction(order.id, 'admin_refund')}
                      disabled={!!actionLoading}
                      className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-md hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50"
                    >
                      {actionLoading === `${order.id}-admin_refund` ? '...' : 'Refund'}
                    </button>
                  )}
                  {dispute && dispute.status === 'open' && (
                    <button
                      onClick={() => setResolveOrderId(resolveOrderId === order.id ? null : order.id)}
                      className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>

              {/* Resolve dispute form */}
              {resolveOrderId === order.id && (
                <div className="mt-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Resolve Dispute</p>
                  <textarea
                    placeholder="Resolution notes (optional)"
                    value={resolveNotes}
                    onChange={e => setResolveNotes(e.target.value)}
                    rows={2}
                    className="w-full mb-2 px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => resolveDispute(order.id, 'resolved_seller')}
                      disabled={!!actionLoading}
                      className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      Favour Seller
                    </button>
                    <button
                      onClick={() => resolveDispute(order.id, 'resolved_buyer')}
                      disabled={!!actionLoading}
                      className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      Favour Buyer
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
