'use client'

import { useState } from 'react'

const CATEGORIES = ['All', 'Grains', 'Tubers', 'Legumes', 'Vegetables', 'Oils', 'Livestock', 'Other']

const CATEGORY_COLOURS: Record<string, string> = {
  grains: 'bg-yellow-100 text-yellow-700',
  tubers: 'bg-orange-100 text-orange-700',
  legumes: 'bg-green-100 text-green-700',
  vegetables: 'bg-emerald-100 text-emerald-700',
  oils: 'bg-amber-100 text-amber-700',
  livestock: 'bg-red-100 text-red-700',
  other: 'bg-gray-100 text-gray-600',
}

type PriceReport = {
  id: string
  commodity: string
  category: string | null
  price: number
  unit: string
  market_name: string | null
  state: string | null
  reported_at: string
  profiles: { first_name: string | null; last_name: string | null } | null
}

export default function PricesClient({ reports }: { reports: PriceReport[] }) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')

  const filtered = reports.filter(r => {
    const matchesSearch =
      !search ||
      r.commodity.toLowerCase().includes(search.toLowerCase()) ||
      (r.state ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (r.market_name ?? '').toLowerCase().includes(search.toLowerCase())

    const matchesCategory =
      categoryFilter === 'All' ||
      r.category?.toLowerCase() === categoryFilter.toLowerCase()

    return matchesSearch && matchesCategory
  })

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(price)

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  return (
    <div>
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-8 space-y-4">
        <input
          type="text"
          placeholder="Search by commodity, state or market..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                categoryFilter === cat
                  ? 'bg-green-600 text-white border-green-600'
                  : 'border-gray-300 text-gray-600 hover:border-green-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-5">
        {filtered.length} {filtered.length === 1 ? 'report' : 'reports'} found
      </p>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📊</p>
          <p className="font-medium">No prices reported yet</p>
          <p className="text-sm mt-1">Be the first to report a market price</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(report => (
            <div
              key={report.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">{report.commodity}</h3>
                  {report.category && (
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium capitalize mt-1 ${CATEGORY_COLOURS[report.category] ?? 'bg-gray-100 text-gray-600'}`}>
                      {report.category}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-green-700">{formatPrice(report.price)}</p>
                  <p className="text-xs text-gray-400">per {report.unit}</p>
                </div>
              </div>
              <div className="space-y-1 text-sm text-gray-500">
                {report.market_name && <p>🏪 {report.market_name}</p>}
                {report.state && <p>📍 {report.state}</p>}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
                <span>
                  Reported by {report.profiles?.first_name ?? 'Member'}
                </span>
                <span>{timeAgo(report.reported_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
