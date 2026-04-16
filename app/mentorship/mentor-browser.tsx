'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import OnlineIndicator from '@/app/components/OnlineIndicator'
import { useSearchLog } from '@/lib/useSearchLog'

interface Mentor {
  id: string
  user_id: string
  headline: string
  expertise: string[]
  bio: string | null
  years_experience: number
  availability: string
  session_format: string[]
  location: string | null
  created_at: string
  avgRating: number | null
  reviewCount: number
  profiles: {
    first_name: string | null
    last_name: string | null
    role: string | null
    institution: string | null
    avatar_url: string | null
    is_verified: boolean
    last_seen_at?: string | null
  }
}

const EXPERTISE_TAGS = [
  'Crop Farming', 'Poultry', 'Aquaculture', 'Livestock', 'Agribusiness',
  'Agritech', 'Food Processing', 'Supply Chain', 'Research', 'Finance',
  'Marketing', 'Policy', 'Sustainability', 'Organic Farming', 'Irrigation',
]

export default function MentorBrowser({ mentors, userId }: { mentors: Mentor[]; userId: string }) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest')
  const [filterExpertise, setFilterExpertise] = useState('All')
  const [filterAvailability, setFilterAvailability] = useState('All')

  const filtered = mentors.filter(m => {
    if (filterExpertise !== 'All' && !m.expertise.some(e => e.toLowerCase() === filterExpertise.toLowerCase())) return false
    if (filterAvailability !== 'All' && m.availability !== filterAvailability) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const name = `${m.profiles?.first_name ?? ''} ${m.profiles?.last_name ?? ''}`.toLowerCase()
      return (
        name.includes(q) ||
        m.headline.toLowerCase().includes(q) ||
        m.expertise.some(e => e.toLowerCase().includes(q)) ||
        (m.location ?? '').toLowerCase().includes(q) ||
        (m.profiles?.institution ?? '').toLowerCase().includes(q)
      )
    }
    return true
  })

  // Sort filtered results
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime() // newest
  })

  useSearchLog(search, 'mentorship', sorted.length)

  return (
    <div>
      {/* Search + Filters */}
      <div className="mb-6 space-y-3">
        <div className="relative">
          <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 pointer-events-none">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search mentors by name, expertise, location..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="flex gap-3 flex-wrap">
          <select
            value={filterExpertise}
            onChange={e => setFilterExpertise(e.target.value)}
            className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300"
          >
            <option value="All">All Expertise</option>
            {EXPERTISE_TAGS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={filterAvailability}
            onChange={e => setFilterAvailability(e.target.value)}
            className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300"
          >
            <option value="All">All Availability</option>
            <option value="Open">Open</option>
            <option value="Limited">Limited</option>
            <option value="Waitlist">Waitlist</option>
            <option value="Closed">Closed</option>
          </select>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>

      {/* Results */}
      {sorted.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">No mentors found</p>
          <p className="text-sm">Try adjusting your filters or be the first to <a href="/mentorship/become-mentor" className="text-green-600 hover:underline">become a mentor</a>.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sorted.map(m => {
            const name = `${m.profiles?.first_name ?? ''} ${m.profiles?.last_name ?? ''}`.trim() || 'Anonymous'
            const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
            return (
              <Link
                key={m.id}
                href={`/mentorship/${m.user_id}`}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 hover:border-green-300 dark:hover:border-green-700 transition-colors block"
              >
                <div className="flex items-start gap-4">
                  <div className="relative shrink-0">
                    {m.profiles?.avatar_url ? (
                      <Image src={m.profiles.avatar_url} alt={name} width={56} height={56} className="rounded-full object-cover" />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 font-bold text-lg">
                        {initials}
                      </div>
                    )}
                    <OnlineIndicator lastSeenAt={m.profiles?.last_seen_at} size="sm" className="absolute bottom-0 right-0" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900 dark:text-white truncate">{name}</h3>
                      {m.profiles?.is_verified && <span className="text-green-500 text-sm" title="Verified">✓</span>}
                      {m.user_id === userId && (
                        <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full font-semibold">You</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">{m.headline}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {m.profiles?.role && <span>{m.profiles.role}</span>}
                      {m.years_experience > 0 && <span>{m.years_experience}y exp</span>}
                      {m.location && <span>{m.location}</span>}
                    </div>
                  </div>
                </div>

                {/* Tags + Rating */}
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex gap-1 flex-wrap">
                    {m.expertise.slice(0, 3).map(tag => (
                      <span key={tag} className="text-[11px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
                        {tag}
                      </span>
                    ))}
                    {m.expertise.length > 3 && (
                      <span className="text-[11px] text-gray-400">+{m.expertise.length - 3}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {m.avgRating !== null && (
                      <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-500">
                        ★ {m.avgRating} <span className="text-xs text-gray-400 font-normal">({m.reviewCount})</span>
                      </span>
                    )}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
  m.availability === 'Open'    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
  m.availability === 'Limited' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
  m.availability === 'Waitlist' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' :
                                  'bg-gray-100 dark:bg-gray-800 text-gray-500'
}`}>
  {m.availability === 'Open' ? 'Open' : m.availability === 'Limited' ? 'Limited' : m.availability === 'Waitlist' ? 'Waitlist' : 'Closed'}
</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
