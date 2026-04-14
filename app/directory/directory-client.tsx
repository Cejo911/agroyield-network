'use client'
import { useState } from 'react'
import Link from 'next/link'
import FollowButton from './follow-button'
import { useSearchLog } from '@/lib/useSearchLog'

const ROLES = ['All', 'Student', 'Researcher', 'Farmer', 'Agripreneur']
const INTERESTS = [
  'Crop Science', 'Livestock', 'Agritech', 'Soil Health',
  'Irrigation', 'Food Processing', 'Agricultural Finance',
  'Climate & Sustainability', 'Supply Chain', 'Research & Development',
]
const STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT Abuja', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers',
  'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
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
  is_verified: boolean
  is_elite: boolean
  is_admin: boolean
  admin_role: string | null
  avatar_url: string | null
}

type Props = {
  profiles: Profile[]
  currentUserId: string
  followingIds: string[]
  followerIds: string[]
  followerCountMap: Record<string, number>
  mentorIds: string[]
  menteeIds: string[]
}

export default function DirectoryClient({ profiles, currentUserId, followingIds, followerIds, followerCountMap, mentorIds, menteeIds }: Props) {
  const [search,         setSearch]         = useState('')
  const [roleFilter,     setRoleFilter]     = useState('All')
  const [interestFilter, setInterestFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [connectionFilter, setConnectionFilter] = useState('All')

  const followingSet = new Set(followingIds)
  const followerSet = new Set(followerIds)
  const mentorSet = new Set(mentorIds)
  const menteeSet = new Set(menteeIds)

  const filtered = profiles.filter(p => {
    const fullName    = `${p.first_name ?? ''} ${p.last_name ?? ''}`.toLowerCase()
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
    const matchesLocation =
      !locationFilter ||
      (p.location ?? '').toLowerCase().includes(locationFilter.toLowerCase())
    const matchesConnection =
      connectionFilter === 'All' ||
      (connectionFilter === 'Following' && followingSet.has(p.id)) ||
      (connectionFilter === 'Followers' && followerSet.has(p.id)) ||
      (connectionFilter === 'Mentors' && mentorSet.has(p.id)) ||
      (connectionFilter === 'Mentees' && menteeSet.has(p.id))
    return matchesSearch && matchesRole && matchesInterest && matchesLocation && matchesConnection
  })

  useSearchLog(search, 'directory', filtered.length)

  return (
    <div>
      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 mb-8 space-y-4">
        <input
          type="text"
          placeholder="Search by name or institution..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <div className="flex flex-wrap gap-2">
          {ROLES.map(role => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                roleFilter === role
                  ? 'bg-green-600 text-white border-green-600'
                  : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-green-400 dark:hover:border-green-500'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select
            value={interestFilter}
            onChange={e => setInterestFilter(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">All areas of interest</option>
            {INTERESTS.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
          <select
            value={locationFilter}
            onChange={e => setLocationFilter(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">All locations</option>
            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {/* Connection filters */}
        <div className="flex flex-wrap gap-2">
          {['All', 'Following', 'Followers', 'Mentors', 'Mentees'].map(opt => (
            <button
              key={opt}
              onClick={() => setConnectionFilter(opt)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                connectionFilter === opt
                  ? 'bg-green-600 text-white border-green-600'
                  : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-green-400 dark:hover:border-green-500'
              }`}
            >
              {opt === 'All' ? 'All Connections' : opt}
              {opt === 'Following' && ` (${followingIds.length})`}
              {opt === 'Followers' && ` (${followerIds.length})`}
              {opt === 'Mentors' && ` (${mentorIds.length})`}
              {opt === 'Mentees' && ` (${menteeIds.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
        {filtered.length} {filtered.length === 1 ? 'member' : 'members'} found
      </p>

      {/* Member cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-4xl mb-3">🌾</p>
          <p className="font-medium">No members match your filters</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(profile => (
            <div
              key={profile.id}
              className="relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 hover:shadow-md hover:border-green-200 dark:hover:border-green-800 transition-all group"
            >
              {/* Follow button */}
              {profile.id !== currentUserId && (
                <div className="absolute top-4 right-4">
                  <FollowButton
                    userId={profile.id}
                    initialIsFollowing={followingSet.has(profile.id)}
                  />
                </div>
              )}

              <Link href={`/directory/${profile.id}`} className="block">
                {/* Avatar */}
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover mb-4" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-green-700 dark:text-green-400 font-bold text-lg mb-4">
                    {profile.first_name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                )}

                <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors pr-20">
                  {profile.first_name} {profile.last_name}
                </h3>

                {/* Role pill + Mentor badge */}
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  {profile.role && (
                    <span className="inline-block text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium capitalize">
                      {profile.role}
                    </span>
                  )}
                  {mentorSet.has(profile.id) && (
                    <span className="inline-flex items-center gap-0.5 text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium border border-green-200 dark:border-green-800">
                      🎓 Mentor
                    </span>
                  )}
                </div>

                {/* Follower count */}
                {(followerCountMap[profile.id] || 0) > 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {followerCountMap[profile.id]} follower{followerCountMap[profile.id] !== 1 ? 's' : ''}
                  </p>
                )}

                {/* Badges */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {profile.is_elite && (
                    <span className="inline-flex items-center gap-0.5 text-xs bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded-full font-medium border border-yellow-200 dark:border-yellow-800">
                      👑 Elite
                    </span>
                  )}
                  {profile.is_verified && (
                    <span className="inline-flex items-center gap-0.5 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium border border-blue-200 dark:border-blue-800">
                      ✓ Verified
                    </span>
                  )}
                  {profile.is_admin && profile.admin_role === 'super' && (
                    <span className="inline-flex items-center gap-0.5 text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-medium border border-red-200 dark:border-red-800">
                      ⚡ Admin
                    </span>
                  )}
                  {profile.is_admin && profile.admin_role === 'moderator' && (
                    <span className="inline-flex items-center gap-0.5 text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full font-medium border border-purple-200 dark:border-purple-800">
                      🛡 Mod
                    </span>
                  )}
                </div>

                {profile.institution && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">🏛 {profile.institution}</p>
                )}
                {profile.location && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">📍 {profile.location}</p>
                )}
                {profile.bio && (
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-3 line-clamp-2">{profile.bio}</p>
                )}
                {profile.interests && profile.interests.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {profile.interests.slice(0, 3).map(interest => (
                      <span
                        key={interest}
                        className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full"
                      >
                        {interest}
                      </span>
                    ))}
                    {profile.interests.length > 3 && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 px-1">
                        +{profile.interests.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
