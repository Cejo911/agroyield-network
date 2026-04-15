'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchLog } from '@/lib/useSearchLog'

const CATEGORIES = ['All', 'Research', 'Startup', 'Student', 'Women', 'Innovation', 'Farmer', 'Policy']
const STATUSES = ['All', 'open', 'upcoming', 'closed']

type Grant = {
  id: string
  title: string
  funder: string
  description: string | null
  amount_min: number | null
  amount_max: number | null
  currency: string
  category: string
  status: string
  region: string | null
  stage: string | null
  eligibility: string | null
  deadline: string | null
  apply_link: string | null
  featured: boolean
  verified: boolean
  save_count: number
  apply_count: number
  created_at: string
  thumbnail_url?: string | null
}

type Props = {
  grants: Grant[]
  applicationMap: Record<string, string>
}

function formatAmount(min: number | null, max: number | null, currency: string): string {
  const fmt = (n: number) => {
    if (currency === 'NGN') return `₦${n.toLocaleString()}`
    if (currency === 'USD') return `$${n.toLocaleString()}`
    return `${currency} ${n.toLocaleString()}`
  }
  if (min && max && min !== max) return `${fmt(min)} – ${fmt(max)}`
  if (max) return `Up to ${fmt(max)}`
  if (min) return `From ${fmt(min)}`
  return ''
}

function daysUntil(deadline: string | null): { text: string; urgent: boolean } | null {
  if (!deadline) return null
  const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return { text: 'Expired', urgent: true }
  if (diff === 0) return { text: 'Due today', urgent: true }
  if (diff <= 7) return { text: `${diff} day${diff !== 1 ? 's' : ''} left`, urgent: true }
  if (diff <= 30) return { text: `${diff} days left`, urgent: false }
  return { text: new Date(deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), urgent: false }
}

const statusColors: Record<string, string> = {
  open: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  upcoming: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  closed: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
}

const appStatusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' },
  submitted: { label: 'Submitted', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  shortlisted: { label: 'Shortlisted', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' },
  rejected: { label: 'Rejected', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
  awarded: { label: 'Awarded', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
}

export default function GrantsClient({ grants, applicationMap }: Props) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'featured' | 'deadline' | 'newest' | 'oldest'>('featured')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')

  const filtered = grants.filter(g => {
    if (categoryFilter !== 'All' && g.category !== categoryFilter) return false
    if (statusFilter !== 'All' && g.status !== statusFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        g.title.toLowerCase().includes(q) ||
        g.funder.toLowerCase().includes(q) ||
        (g.description ?? '').toLowerCase().includes(q) ||
        (g.region ?? '').toLowerCase().includes(q)
      )
    }
    return true
  })

  // Sort filtered results
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'featured') {
      // Featured first, then by deadline ascending (original server sort)
      if (a.featured !== b.featured) return a.featured ? -1 : 1
      if (!a.deadline && !b.deadline) return 0
      if (!a.deadline) return 1
      if (!b.deadline) return -1
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    }
    if (sortBy === 'deadline') {
      if (!a.deadline && !b.deadline) return 0
      if (!a.deadline) return 1
      if (!b.deadline) return -1
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    }
    if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime() // newest
  })

  useSearchLog(search, 'grants', sorted.length)

  return (
    <div>
      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 mb-8 space-y-4">
        <input
          type="text"
          placeholder="Search grants by title, funder, or keyword..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                categoryFilter === cat
                  ? 'bg-green-600 text-white border-green-600'
                  : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-green-400 dark:hover:border-green-500'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                statusFilter === s
                  ? 'bg-green-600 text-white border-green-600'
                  : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-green-400 dark:hover:border-green-500'
              }`}
            >
              {s === 'All' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">{sorted.length} {sorted.length === 1 ? 'grant' : 'grants'} found</p>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="featured">Featured first</option>
            <option value="deadline">Deadline (soonest)</option>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>

      {/* Grant cards */}
      {sorted.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-4xl mb-3">🌱</p>
          <p className="font-medium">No grants match your filters</p>
          <p className="text-sm mt-1">Try adjusting your search or check back later for new opportunities</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map(grant => {
            const amount = formatAmount(grant.amount_min, grant.amount_max, grant.currency)
            const dl = daysUntil(grant.deadline)
            const appStatus = applicationMap[grant.id]

            return (
              <Link
                key={grant.id}
                href={`/grants/${grant.id}`}
                className="block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 hover:border-green-300 dark:hover:border-green-700 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-4">
                  {grant.thumbnail_url && (
                    <img
                      src={grant.thumbnail_url}
                      alt=""
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover shrink-0 border border-gray-100 dark:border-gray-800"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {grant.featured && (
                        <span className="text-[10px] font-bold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded-full">
                          ⭐ Featured
                        </span>
                      )}
                      {grant.verified && (
                        <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                          ✓ Verified
                        </span>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColors[grant.status] || statusColors.closed}`}>
                        {grant.status.charAt(0).toUpperCase() + grant.status.slice(1)}
                      </span>
                      <span className="text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
                        {grant.category}
                      </span>
                      {appStatus && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${appStatusLabels[appStatus]?.color || ''}`}>
                          {appStatusLabels[appStatus]?.label || appStatus}
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">{grant.title}</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{grant.funder}</p>
                    {grant.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{grant.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                      {amount && <span className="font-semibold text-gray-700 dark:text-gray-300">{amount}</span>}
                      {grant.region && <span>📍 {grant.region}</span>}
                      {grant.stage && <span>🏷 {grant.stage}</span>}
                      {grant.apply_count > 0 && <span>{grant.apply_count} applied</span>}
                    </div>
                  </div>
                  {dl && (
                    <div className={`text-right shrink-0 ${dl.urgent ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      <p className={`text-sm font-semibold ${dl.urgent ? '' : ''}`}>{dl.text}</p>
                      <p className="text-[10px] mt-0.5">Deadline</p>
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
