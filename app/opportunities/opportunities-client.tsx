'use client'
import { useState } from 'react'
import Link from 'next/link'
import LikeButton from '@/app/components/LikeButton'
import ReportButton from '@/app/components/ReportButton'

const TYPES = ['All', 'Grant', 'Fellowship', 'Job', 'Partnership', 'Internship', 'Training']

const TYPE_COLOURS: Record<string, string> = {
  grant:       'bg-green-100  dark:bg-green-900/30  text-green-700  dark:text-green-400',
  fellowship:  'bg-blue-100   dark:bg-blue-900/30   text-blue-700   dark:text-blue-400',
  job:         'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  partnership: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  internship:  'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  training:    'bg-pink-100   dark:bg-pink-900/30   text-pink-700   dark:text-pink-400',
}

type Opportunity = {
  id: string
  title: string
  type: string | null
  organisation: string | null
  location: string | null
  description: string | null
  deadline: string | null
  created_at: string
}

const isExpired = (deadline: string | null) => {
  if (!deadline) return false
  return new Date(deadline) < new Date()
}

export default function OpportunitiesClient({ opportunities }: { opportunities: Opportunity[] }) {
  const [search,       setSearch]       = useState('')
  const [typeFilter,   setTypeFilter]   = useState('All')
  const [hideExpired,  setHideExpired]  = useState(false)

  const filtered = opportunities.filter(o => {
    const matchesSearch =
      !search ||
      o.title.toLowerCase().includes(search.toLowerCase()) ||
      (o.organisation ?? '').toLowerCase().includes(search.toLowerCase())
    const matchesType   = typeFilter === 'All' || o.type?.toLowerCase() === typeFilter.toLowerCase()
    const matchesExpiry = !hideExpired || !isExpired(o.deadline)
    return matchesSearch && matchesType && matchesExpiry
  })

  return (
    <div>
      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 mb-8 space-y-4">
        <input
          type="text"
          placeholder="Search by title or organisation..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <div className="flex flex-wrap gap-2">
          {TYPES.map(type => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                typeFilter === type
                  ? 'bg-green-600 text-white border-green-600'
                  : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-green-400 dark:hover:border-green-500'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-800">
          <span className="text-sm text-gray-500 dark:text-gray-400">Hide expired opportunities</span>
          <button
            type="button"
            onClick={() => setHideExpired(prev => !prev)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${hideExpired ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${hideExpired ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
        {filtered.length} {filtered.length === 1 ? 'opportunity' : 'opportunities'} found
      </p>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-4xl mb-3">🌱</p>
          <p className="font-medium">No opportunities match your filters</p>
          <p className="text-sm mt-1">Try adjusting your search or be the first to post one</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(opportunity => (
            <div key={opportunity.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-green-200 dark:hover:border-green-800 transition-all group">
              <Link href={`/opportunities/${opportunity.id}`} className="block p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {opportunity.type && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${TYPE_COLOURS[opportunity.type] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                          {opportunity.type}
                        </span>
                      )}
                      {isExpired(opportunity.deadline) && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                          Expired
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors text-lg">
                      {opportunity.title}
                    </h3>
                    {opportunity.organisation && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">🏛 {opportunity.organisation}</p>
                    )}
                    {opportunity.location && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">📍 {opportunity.location}</p>
                    )}
                    {opportunity.description && (
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-3 line-clamp-2">{opportunity.description}</p>
                    )}
                  </div>
                  {opportunity.deadline && (
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-400 dark:text-gray-500">Deadline</p>
                      <p className={`text-sm font-medium ${isExpired(opportunity.deadline) ? 'text-red-500 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {new Date(opportunity.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  )}
                </div>
              </Link>
              <div className="px-6 pb-4 flex items-center gap-4 border-t border-gray-100 dark:border-gray-800 pt-3">
                <LikeButton postId={opportunity.id} postType="opportunity" />
                <ReportButton postId={opportunity.id} postType="opportunity" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
