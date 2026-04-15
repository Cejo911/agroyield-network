'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ReportButton from '@/app/components/ReportButton'
import { useSearchLog } from '@/lib/useSearchLog'
import { createClient } from '@/lib/supabase/client'

const CATEGORIES = ['All', 'Grains', 'Tubers', 'Legumes', 'Vegetables', 'Oils', 'Livestock', 'Other']
const CATEGORY_COLOURS: Record<string, string> = {
  grains:     'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  tubers:     'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  legumes:    'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  vegetables: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  oils:       'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  livestock:  'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  other:      'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
}

type PriceReport = {
  id: string
  user_id: string
  commodity: string
  category: string | null
  price: number
  unit: string
  market_name: string | null
  state: string | null
  reported_at: string
  profiles: {
    first_name: string | null
    last_name: string | null
    username: string | null
    avatar_url: string | null
  } | null
}

export default function PricesClient({
  reports,
  userId,
}: {
  reports: PriceReport[]
  userId: string
}) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'price_low' | 'price_high'>('newest')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [localReports, setLocalReports] = useState(reports)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filtered = localReports.filter(r => {
    const matchesSearch =
      !search ||
      r.commodity.toLowerCase().includes(search.toLowerCase()) ||
      (r.state ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (r.market_name ?? '').toLowerCase().includes(search.toLowerCase())
    const matchesCategory =
      categoryFilter === 'All' ||
      (r.category ?? '').toLowerCase() === categoryFilter.toLowerCase()
    return matchesSearch && matchesCategory
  })

  // Sort filtered results
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'oldest') return new Date(a.reported_at).getTime() - new Date(b.reported_at).getTime()
    if (sortBy === 'price_low') return a.price - b.price
    if (sortBy === 'price_high') return b.price - a.price
    return new Date(b.reported_at).getTime() - new Date(a.reported_at).getTime() // newest
  })

  useSearchLog(search, 'prices', sorted.length)

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency', currency: 'NGN', maximumFractionDigits: 0,
    }).format(price)

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  const getCategoryColour = (category: string | null): string => {
    if (!category) return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
    return CATEGORY_COLOURS[category.toLowerCase()] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    const supabase = createClient()
    await supabase.from('price_reports').delete().eq('id', id)
    setLocalReports(prev => prev.filter(r => r.id !== id))
    setDeletingId(null)
    setConfirmingId(null)
  }

  return (
    <div>
      {/* Filter panel */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 mb-8 space-y-4">
        <input
          type="text"
          placeholder="Search by commodity, state or market..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategoryFilter(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                categoryFilter === cat
                  ? 'bg-green-600 text-white border-green-600'
                  : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-green-400 dark:hover:border-green-500'
              }`}>
              {cat}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">{sorted.length} {sorted.length === 1 ? 'report' : 'reports'} found</p>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="newest">Most recent</option>
            <option value="oldest">Oldest first</option>
            <option value="price_low">Price: Low → High</option>
            <option value="price_high">Price: High → Low</option>
          </select>
        </div>
      </div>

      {/* Empty state */}
      {sorted.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-4xl mb-3">📊</p>
          <p className="font-medium">No prices reported yet</p>
          <p className="text-sm mt-1">Be the first to report a market price</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map(report => {
            const isOwner = report.user_id === userId
            const isConfirming = confirmingId === report.id
            const isDeleting = deletingId === report.id

            return (
              <div key={report.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                      {report.commodity}
                    </h3>
                    {report.category && (
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium capitalize mt-1 ${getCategoryColour(report.category)}`}>
                        {report.category}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-green-700 dark:text-green-400">
                      {formatPrice(report.price)}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">per {report.unit}</p>
                  </div>
                </div>

                <div className="space-y-1 text-sm text-gray-500 dark:text-gray-400">
                  {report.market_name && <p>🏪 {report.market_name}</p>}
                  {report.state && <p>📍 {report.state}</p>}
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    {report.profiles ? (
                      <Link
                        href={report.profiles.username ? `/u/${report.profiles.username}` : `/directory/${report.user_id}`}
                        className="flex items-center gap-1.5 group min-w-0"
                      >
                        {report.profiles.avatar_url ? (
                          <img src={report.profiles.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                        ) : (
                          <span className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {(report.profiles.first_name?.[0] || '?').toUpperCase()}
                          </span>
                        )}
                        <span className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors truncate">
                          {[report.profiles.first_name, report.profiles.last_name].filter(Boolean).join(' ') || 'Anonymous'}
                        </span>
                      </Link>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-500">Anonymous</span>
                    )}
                    <span className="text-gray-300 dark:text-gray-700">·</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                      {timeAgo(report.reported_at)}
                    </span>
                  </div>

                  {isOwner ? (
                    <div className="flex items-center gap-2">
                      {!isConfirming ? (
                        <>
                          <button onClick={() => router.push(`/prices/${report.id}/edit`)} className="text-xs text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 font-medium transition-colors">
                            ✏️ Edit
                          </button>
                          <span className="text-gray-300 dark:text-gray-700">|</span>
                          <button onClick={() => setConfirmingId(report.id)} className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 font-medium transition-colors">
                            🗑️ Delete
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Delete?</span>
                          <button onClick={() => handleDelete(report.id)} disabled={isDeleting} className="text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50 transition-colors">
                            {isDeleting ? 'Deleting…' : 'Yes'}
                          </button>
                          <button onClick={() => setConfirmingId(null)} disabled={isDeleting} className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                            No
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <ReportButton postId={report.id} postType="price_report" />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
