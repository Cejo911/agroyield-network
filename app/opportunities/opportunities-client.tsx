'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import LikeButton from '@/app/components/LikeButton'
import ReportButton from '@/app/components/ReportButton'
import BookmarkButton from '@/app/components/design/BookmarkButton'
import { useSearchLog } from '@/lib/useSearchLog'

export type Opportunity = {
  id: string
  user_id: string
  title: string
  type: string
  organisation: string | null
  location: string | null
  description: string
  deadline: string | null
  is_closed: boolean
  created_at: string
  thumbnail_url?: string | null
}

export default function OpportunitiesClient({
  opportunities: initial,
  userId,
  savedIds = [],
}: {
  opportunities: Opportunity[]
  userId: string
  savedIds?: string[]
}) {
  const savedSet = new Set(savedIds)
  const [opportunities, setOpportunities] = useState(initial)
  const [search, setSearch]               = useState('')
  const [sortBy, setSortBy]               = useState<'newest' | 'oldest' | 'deadline'>('newest')
  const [typeFilter, setTypeFilter]       = useState('all')
  const [confirmingId, setConfirmingId]   = useState<string | null>(null)
  const [deletingId, setDeletingId]       = useState<string | null>(null)
  const [togglingId, setTogglingId]       = useState<string | null>(null)

  // Derive unique types for filter pills
  const types = ['all', ...Array.from(new Set(initial.map(o => o.type).filter(Boolean)))]

  // Filter by search + type
  const filtered = opportunities.filter(o => {
    const matchesType = typeFilter === 'all' || o.type === typeFilter
    const q = search.toLowerCase()
    const matchesSearch = !q
      || o.title.toLowerCase().includes(q)
      || (o.organisation?.toLowerCase().includes(q) ?? false)
      || (o.location?.toLowerCase().includes(q) ?? false)
      || (o.description?.toLowerCase().includes(q) ?? false)
    return matchesType && matchesSearch
  })

  // Sort filtered results
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    if (sortBy === 'deadline') {
      // Items without deadlines go last
      if (!a.deadline && !b.deadline) return 0
      if (!a.deadline) return 1
      if (!b.deadline) return -1
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime() // newest
  })

  useSearchLog(search, 'opportunities', sorted.length)

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    const supabase = createClient()
    await supabase.from('opportunities').update({ is_active: false }).eq('id', id)
    setOpportunities(prev => prev.filter(o => o.id !== id))
    setDeletingId(null)
    setConfirmingId(null)
  }

  const handleToggleClosed = async (id: string, isClosed: boolean) => {
    setTogglingId(id)
    const supabase = createClient()
    await supabase.from('opportunities').update({ is_closed: !isClosed }).eq('id', id)
    setOpportunities(prev => prev.map(o => o.id === id ? { ...o, is_closed: !isClosed } : o))
    setTogglingId(null)
  }

  if (initial.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400 dark:text-gray-500">
        <p className="text-lg font-medium mb-1">No opportunities yet</p>
        <p className="text-sm">Be the first to post one.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search + type filter */}
      <div className="space-y-3 mb-2">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search opportunities..."
          className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <div className="flex gap-2 flex-wrap">
          {types.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border capitalize transition-colors ${
                typeFilter === t
                  ? 'bg-green-600 text-white border-green-600'
                  : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-green-400'
              }`}
            >
              {t === 'all' ? 'All' : t}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">{sorted.length} {sorted.length === 1 ? 'opportunity' : 'opportunities'}</p>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="deadline">Deadline (soonest)</option>
          </select>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          <p className="font-medium">No opportunities match your search</p>
          <p className="text-sm mt-1">Try different keywords or clear the filter</p>
        </div>
      ) : null}

      {sorted.map(opportunity => {
        const isOwner  = opportunity.user_id === userId
        const isClosed = opportunity.is_closed ?? false
        const deadline = opportunity.deadline
          ? new Date(opportunity.deadline).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric',
            })
          : null

        return (
          <div
            key={opportunity.id}
            className={`relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all ${isClosed ? 'opacity-70' : ''}`}
          >
            {/* BookmarkButton overlays the card-level <Link>. stopPropagation */}
            {/* ensures a click here doesn't also navigate to the detail page. */}
            <div className="absolute top-4 right-4 z-10">
              <BookmarkButton
                contentType="opportunity"
                contentId={opportunity.id}
                initiallySaved={savedSet.has(opportunity.id)}
                stopPropagation
              />
            </div>
            <Link href={`/opportunities/${opportunity.id}`} className="block p-5 pr-14 group">
              <div className="flex items-start gap-4 mb-2">
                {opportunity.thumbnail_url && (
                  <Image
                    src={opportunity.thumbnail_url}
                    alt=""
                    width={80}
                    height={80}
                    className="rounded-lg object-cover shrink-0 border border-gray-100 dark:border-gray-800"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                      {opportunity.type}
                    </span>
                    {isClosed && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                        CLOSED
                      </span>
                    )}
                  </div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                    {opportunity.title}
                  </h2>
                  {opportunity.organisation && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{opportunity.organisation}</p>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                {opportunity.description}
              </p>
              <div className="flex flex-wrap gap-3 text-xs text-gray-400 dark:text-gray-500">
                {opportunity.location && <span>📍 {opportunity.location}</span>}
                {deadline && <span>⏰ {deadline}</span>}
              </div>
            </Link>

            <div className="mt-0 pt-3 pb-4 px-5 border-t border-gray-100 dark:border-gray-800 flex items-center gap-3">
              <LikeButton postId={opportunity.id} postType="opportunity" />
              <ReportButton postId={opportunity.id} postType="opportunity" />

              {isOwner && (
                <div className="ml-auto flex items-center gap-2">
                  {confirmingId === opportunity.id ? (
                    <>
                      <button onClick={() => setConfirmingId(null)} className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-2 py-1 rounded transition-colors">Cancel</button>
                      <button onClick={() => handleDelete(opportunity.id)} disabled={deletingId === opportunity.id} className="text-xs bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
                        {deletingId === opportunity.id ? 'Deleting…' : 'Confirm delete'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleToggleClosed(opportunity.id, isClosed)}
                        disabled={togglingId === opportunity.id}
                        className={`text-xs px-2 py-1 rounded transition-colors disabled:opacity-50 ${
                          isClosed
                            ? 'text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300'
                            : 'text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300'
                        }`}
                      >
                        {togglingId === opportunity.id ? '…' : isClosed ? '🔓 Re-open' : '🔒 Close'}
                      </button>
                      <Link href={`/opportunities/${opportunity.id}/edit`} className="text-xs text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 px-2 py-1 rounded transition-colors">✏️ Edit</Link>
                      <button onClick={() => setConfirmingId(opportunity.id)} className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 px-2 py-1 rounded transition-colors">🗑️ Delete</button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
