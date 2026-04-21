'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import FollowButton from './follow-button'
import OnlineIndicator from '@/app/components/OnlineIndicator'
import { useSearchLog } from '@/lib/useSearchLog'
import { isOpenNow } from '@/lib/open-to-opportunities'

const ROLES = ['All', 'Student', 'Researcher', 'Farmer', 'Agripreneur', 'Institution']
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
  subscription_tier: string | null
  account_type?: string | null
  institution_type?: string | null
  institution_display_name?: string | null
  is_institution_verified?: boolean | null
  last_seen_at?: string | null
  open_to_opportunities?: boolean | null
  open_to_opportunities_until?: string | null
}

const INST_TYPE_LABELS: Record<string, string> = {
  university: 'University & Research',
  government: 'Government Agency',
  ngo: 'NGO & Foundation',
  agri_company: 'Agri-Company & Cooperative',
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
  const [openOnly,         setOpenOnly]         = useState(false)

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
      (roleFilter === 'Institution' ? p.account_type === 'institution' : p.role?.toLowerCase() === roleFilter.toLowerCase())
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
    const matchesOpen = !openOnly || isOpenNow(p)
    return matchesSearch && matchesRole && matchesInterest && matchesLocation && matchesConnection && matchesOpen
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
        {/* Open to Opportunities pill — sits between the location row and  */}
        {/* the connection-scope row so it reads as "filter the list" not    */}
        {/* "scope to my graph". Visually distinguished with a green tint    */}
        {/* when active so it never feels like a passive checkbox.           */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setOpenOnly(prev => !prev)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors flex items-center gap-1.5 ${
              openOnly
                ? 'bg-green-600 text-white border-green-600'
                : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-green-400 dark:hover:border-green-500'
            }`}
            aria-pressed={openOnly}
          >
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${openOnly ? 'bg-white' : 'bg-green-500'}`} />
            Open to Opportunities
          </button>
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
          <Image src="/logo-icon-colored.png" alt="AgroYield Network" width={44} height={44} className="mx-auto mb-3" />
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
                  <Image src={profile.avatar_url} alt="" width={48} height={48} className="w-12 h-12 rounded-full object-cover mb-4" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-green-700 dark:text-green-400 font-bold text-lg mb-4">
                    {profile.first_name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                )}

                <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors pr-20 flex items-center gap-1.5">
                  <OnlineIndicator lastSeenAt={profile.last_seen_at} size="sm" />
                  {profile.account_type === 'institution'
                    ? (profile.institution_display_name || [profile.first_name, profile.last_name].filter(Boolean).join(' '))
                    : `${profile.first_name} ${profile.last_name}`}
                </h3>

                {/* Role pill + Mentor badge + Institution badge */}
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  {profile.account_type === 'institution' ? (
                    <>
                      <span className="inline-flex items-center gap-0.5 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">
                        🏛 {INST_TYPE_LABELS[profile.institution_type ?? ''] || 'Institution'}
                      </span>
                      {profile.is_institution_verified && (
                        <span className="inline-flex items-center gap-0.5 text-xs bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full font-medium border border-green-200 dark:border-green-800">
                          ✓ Verified
                        </span>
                      )}
                    </>
                  ) : profile.role ? (
                    <span className="inline-block text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium capitalize">
                      {profile.role}
                    </span>
                  ) : null}
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
                  {isOpenNow(profile) && (
                    <span className="inline-flex items-center gap-0.5 text-xs bg-green-600 text-white px-2 py-0.5 rounded-full font-bold tracking-wide" title="Open to opportunities">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      OPEN
                    </span>
                  )}
                  {profile.subscription_tier === 'growth' && (
                    <span className="inline-flex items-center gap-0.5 text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium border border-amber-200 dark:border-amber-800">
                      ⭐ Growth
                    </span>
                  )}
                  {profile.subscription_tier === 'pro' && (
                    <span className="inline-flex items-center gap-0.5 text-xs bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full font-medium border border-green-200 dark:border-green-800">
                      ✓ Pro
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
