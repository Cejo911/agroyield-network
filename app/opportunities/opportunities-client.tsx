'use client'
import { useState } from 'react'
import Link from 'next/link'

const TYPES = ['All', 'Grant', 'Fellowship', 'Job', 'Partnership', 'Internship', 'Training']
const TYPE_COLOURS: Record<string, string> = {
  grant: 'bg-green-100 text-green-700',
  fellowship: 'bg-blue-100 text-blue-700',
  job: 'bg-purple-100 text-purple-700',
  partnership: 'bg-orange-100 text-orange-700',
  internship: 'bg-yellow-100 text-yellow-700',
  training: 'bg-pink-100 text-pink-700',
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
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [hideExpired, setHideExpired] = useState(false)

  const filtered = opportunities.filter(o => {
    const matchesSearch =
      !search ||
      o.title.toLowerCase().includes(search.toLowerCase()) ||
      (o.organisation ?? '').toLowerCase().includes(search.toLowerCase())
    const matchesType =
      typeFilter === 'All' ||
      o.type?.toLowerCase() === typeFilter.toLowerCase()
    const matchesExpiry = !hideExpired || !isExpired(o.deadline)
    return matchesSearch && matchesType && matchesExpiry
  })

  return (
    <div>
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-8 space-y-4">
        <input
          type="text"
          placeholder="Search by title or organisation..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <div className="flex flex-wrap gap-2">
          {TYPES.map(type => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                typeFilter === type
                  ? 'bg-green-600 text-white border-green-600'
                  : 'border-gray-300 text-gray-600 hover:border-green-400'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
          <span className="text-sm text-gray-500">Hide expired opportunities</span>
          <button
            type="button"
            onClick={() => setHideExpired(prev => !prev)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              hideExpired ? 'bg-green-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                hideExpired ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500 mb-5">
        {filtered.length} {filtered.length === 1 ? 'opportunity' : 'opportunities'} found
      </p>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🌱</p>
          <p className="font-medium">No opportunities match your filters</p>
          <p className="text-sm mt-1">Try adjusting your search or be the first to post one</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(opportunity => (
            <Link
              key={opportunity.id}
              href={`/opportunities/${opportunity.id}`}
              className="block bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md hover:border-green-200 transition-all group"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {opportunity.type && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${TYPE_COLOURS[opportunity.type] ?? 'bg-gray-100 text-gray-600'}`}>
                        {opportunity.type}
                      </span>
                    )}
                    {isExpired(opportunity.deadline) && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-600">
                        Expired
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors text-lg">
                    {opportunity.title}
                  </h3>
                  {opportunity.organisation && (
                    <p className="text-sm text-gray-500 mt-1">🏛 {opportunity.organisation}</p>
                  )}
                  {opportunity.location && (
                    <p className="text-sm text-gray-500 mt-0.5">📍 {opportunity.location}</p>
                  )}
                  {opportunity.description && (
                    <p className="text-sm text-gray-400 mt-3 line-clamp-2">{opportunity.description}</p>
                  )}
                </div>
                {opportunity.deadline && (
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400">Deadline</p>
                    <p className={`text-sm font-medium ${isExpired(opportunity.deadline) ? 'text-red-500' : 'text-gray-700'}`}>
                      {new Date(opportunity.deadline).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </p>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
