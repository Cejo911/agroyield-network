'use client'

import { useState } from 'react'
import Link from 'next/link'

const ROLES = ['All', 'Student', 'Researcher', 'Farmer', 'Agripreneur']

const INTERESTS = [
  'Crop Science', 'Livestock', 'Agritech', 'Soil Health',
  'Irrigation', 'Food Processing', 'Agricultural Finance',
  'Climate & Sustainability', 'Supply Chain', 'Research & Development',
]

type Profile = {
  id: string
  first_name: string | null
  last_name: string | null
  role: string | null
  bio: string | null
  location: string | null
  institution: string | null
  interests: string[] | null
}

export default function DirectoryClient({ profiles }: { profiles: Profile[] }) {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('All')
  const [interestFilter, setInterestFilter] = useState('')

  const filtered = profiles.filter(p => {
    const fullName = `${p.first_name ?? ''} ${p.last_name ?? ''}`.toLowerCase()
    const institution = (p.institution ?? '').toLowerCase()
    const matchesSearch =
      !search ||
      fullName.includes(search.toLowerCase()) ||
      institution.includes(search.toLowerCase())

    const matchesRole =
      roleFilter === 'All' ||
      p.role?.toLowerCase() === roleFilter.toLowerCase()

    const matchesInterest =
      !interestFilter ||
      p.interests?.includes(interestFilter)

    return matchesSearch && matchesRole && matchesInterest
  })

  return (
    <div>
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-8 space-y-4">
        <input
          type="text"
          placeholder="Search by name or institution..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <div className="flex flex-wrap gap-2">
          {ROLES.map(role => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                roleFilter === role
                  ? 'bg-green-600 text-white border-green-600'
                  : 'border-gray-300 text-gray-600 hover:border-green-400'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
        <select
          value={interestFilter}
          onChange={e => setInterestFilter(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">All areas of interest</option>
          {INTERESTS.map(i => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500 mb-5">
        {filtered.length} {filtered.length === 1 ? 'member' : 'members'} found
      </p>

      {/* Member cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🌾</p>
          <p className="font-medium">No members match your filters</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(profile => (
            <Link
              key={profile.id}
              href={`/profile/${profile.id}`}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-green-200 transition-all group"
            >
              {/* Avatar placeholder */}
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-lg mb-4">
                {profile.first_name?.[0]?.toUpperCase() ?? '?'}
              </div>

              <h3 className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors">
                {profile.first_name} {profile.last_name}
              </h3>

              {profile.role && (
                <span className="inline-block mt-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium capitalize">
                  {profile.role}
                </span>
              )}

              {profile.institution && (
                <p className="text-sm text-gray-500 mt-2">🏛 {profile.institution}</p>
              )}

              {profile.location && (
                <p className="text-sm text-gray-500 mt-1">📍 {profile.location}</p>
              )}

              {profile.bio && (
                <p className="text-sm text-gray-400 mt-3 line-clamp-2">{profile.bio}</p>
              )}

              {profile.interests && profile.interests.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {profile.interests.slice(0, 3).map(interest => (
                    <span
                      key={interest}
                      className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full"
                    >
                      {interest}
                    </span>
                  ))}
                  {profile.interests.length > 3 && (
                    <span className="text-xs text-gray-400 px-1">
                      +{profile.interests.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
