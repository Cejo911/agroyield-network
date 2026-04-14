'use client'
import { useState } from 'react'
import { SearchBar, FilterPills } from './AdminSearchBar'

interface MentorProfile {
  id: string
  user_id: string
  headline: string | null
  expertise: string | null
  availability: string | null
  is_active: boolean
  updated_at: string
}

interface MentorshipRequest {
  id: string
  mentor_id: string
  mentee_id: string
  topic: string | null
  status: string
  created_at: string
}

export default function MentorshipTab({
  mentors: initialMentors,
  requests: initialRequests,
  getDisplayName,
  fmt,
}: {
  mentors: MentorProfile[]
  requests: MentorshipRequest[]
  getDisplayName: (id: string) => string
  fmt: (d: string) => string
}) {
  const [mentors, setMentors] = useState(initialMentors)
  const [requests, setRequests] = useState(initialRequests)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'mentors' | 'requests'>('mentors')
  const [mentorFilter, setMentorFilter] = useState('all')
  const [requestFilter, setRequestFilter] = useState('all')

  // Mentor actions
  const mentorAction = async (id: string, mentorActionType: string) => {
    setMentors(prev => prev.map(m => {
      if (m.id !== id) return m
      if (mentorActionType === 'deactivate') return { ...m, is_active: false }
      if (mentorActionType === 'reactivate') return { ...m, is_active: true }
      return m
    }))
    await fetch('/api/admin/mentorship', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, targetType: 'mentor', action: mentorActionType }),
    })
  }

  // Request actions
  const requestAction = async (id: string, reqAction: string) => {
    setRequests(prev => prev.map(r => {
      if (r.id !== id) return r
      if (reqAction === 'cancel') return { ...r, status: 'cancelled' }
      return r
    }))
    await fetch('/api/admin/mentorship', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, targetType: 'request', action: reqAction }),
    })
  }

  // Filtered mentors
  const filteredMentors = mentors.filter(m => {
    const q = search.toLowerCase()
    const matchesSearch = !q || m.headline?.toLowerCase().includes(q) || m.expertise?.toLowerCase().includes(q) || getDisplayName(m.user_id).toLowerCase().includes(q)
    const matchesFilter = mentorFilter === 'all'
      || (mentorFilter === 'active' && m.is_active)
      || (mentorFilter === 'inactive' && !m.is_active)
    return matchesSearch && matchesFilter
  })

  // Filtered requests
  const filteredRequests = requests.filter(r => {
    const q = search.toLowerCase()
    const matchesSearch = !q || r.topic?.toLowerCase().includes(q) || getDisplayName(r.mentor_id).toLowerCase().includes(q) || getDisplayName(r.mentee_id).toLowerCase().includes(q)
    const matchesFilter = requestFilter === 'all'
      || (requestFilter === 'pending' && r.status === 'pending')
      || (requestFilter === 'accepted' && r.status === 'accepted')
      || (requestFilter === 'cancelled' && r.status === 'cancelled')
    return matchesSearch && matchesFilter
  })

  return (
    <div>
      {/* View toggle */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => { setView('mentors'); setSearch('') }}
          className={`text-sm font-medium px-4 py-2 rounded-md transition-colors ${view === 'mentors' ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
          Mentor Profiles ({mentors.length})
        </button>
        <button onClick={() => { setView('requests'); setSearch('') }}
          className={`text-sm font-medium px-4 py-2 rounded-md transition-colors ${view === 'requests' ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
          Mentorship Requests ({requests.length})
        </button>
      </div>

      {/* ── Mentors view ── */}
      {view === 'mentors' && (
        <div>
          <SearchBar value={search} onChange={setSearch} placeholder="Search mentors by name, headline, or expertise..." />
          <FilterPills value={mentorFilter} onChange={setMentorFilter} options={[
            { id: 'all', label: `All (${mentors.length})` },
            { id: 'active', label: `Active (${mentors.filter(m => m.is_active).length})` },
            { id: 'inactive', label: `Inactive (${mentors.filter(m => !m.is_active).length})` },
          ]} />
          <div className="space-y-3">
            {filteredMentors.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-sm">No mentor profiles found.</p>}
            {filteredMentors.map(m => (
              <div key={m.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{getDisplayName(m.user_id)}</span>
                    {m.is_active ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">Active</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">Inactive</span>
                    )}
                    {m.availability && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 capitalize">{m.availability}</span>}
                  </div>
                  {m.headline && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{m.headline}</p>}
                  {m.expertise && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Expertise: {m.expertise}</p>}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Updated {fmt(m.updated_at)}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {m.is_active ? (
                    <button onClick={() => mentorAction(m.id, 'deactivate')} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700">Deactivate</button>
                  ) : (
                    <button onClick={() => mentorAction(m.id, 'reactivate')} className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-md hover:bg-green-200">Reactivate</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Requests view ── */}
      {view === 'requests' && (
        <div>
          <SearchBar value={search} onChange={setSearch} placeholder="Search requests by topic, mentor, or mentee..." />
          <FilterPills value={requestFilter} onChange={setRequestFilter} options={[
            { id: 'all', label: `All (${requests.length})` },
            { id: 'pending', label: `Pending (${requests.filter(r => r.status === 'pending').length})` },
            { id: 'accepted', label: `Accepted (${requests.filter(r => r.status === 'accepted').length})` },
            { id: 'cancelled', label: `Cancelled (${requests.filter(r => r.status === 'cancelled').length})` },
          ]} />
          <div className="space-y-3">
            {filteredRequests.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-sm">No mentorship requests found.</p>}
            {filteredRequests.map(r => (
              <div key={r.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                      r.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                        : r.status === 'accepted' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}>{r.status}</span>
                  </div>
                  {r.topic && <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{r.topic}</p>}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Mentor: {getDisplayName(r.mentor_id)} · Mentee: {getDisplayName(r.mentee_id)}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{fmt(r.created_at)}</p>
                </div>
                {r.status !== 'cancelled' && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => requestAction(r.id, 'cancel')} className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700">Cancel</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
