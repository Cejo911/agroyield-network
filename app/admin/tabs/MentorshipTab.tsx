'use client'
import { useState } from 'react'
import { SearchBar, FilterPills } from './AdminSearchBar'

interface MentorProfile {
  user_id: string
  headline: string | null
  expertise: string | null
  availability: string | null
  is_active: boolean
  updated_at: string
  approval_status?: 'pending' | 'approved' | 'rejected' | null
  approved_at?: string | null
  approved_by?: string | null
  rejection_reason?: string | null
  created_at?: string | null
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
  const [mentorFilter, setMentorFilter] = useState('pending')
  const [requestFilter, setRequestFilter] = useState('all')

  // Approval-flow actions. Approve is a one-click action; reject prompts for
  // a reason because the email back to the applicant cites it verbatim.
  const approveMentor = async (id: string) => {
    setMentors(prev => prev.map(m =>
      m.user_id === id
        ? { ...m, approval_status: 'approved' as const, is_active: true, rejection_reason: null, approved_at: new Date().toISOString() }
        : m,
    ))
    await fetch('/api/admin/mentorship', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, targetType: 'mentor', action: 'approve' }),
    })
  }

  const rejectMentor = async (id: string) => {
    const reason = window.prompt(
      'Why is this mentor application being rejected? The applicant will see this reason in the rejection email.',
    )
    if (!reason || !reason.trim()) return

    setMentors(prev => prev.map(m =>
      m.user_id === id
        ? { ...m, approval_status: 'rejected' as const, is_active: false, rejection_reason: reason.trim() }
        : m,
    ))
    const res = await fetch('/api/admin/mentorship', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, targetType: 'mentor', action: 'reject', reason: reason.trim() }),
    })
    if (!res.ok) {
      // Revert optimistic update on failure
      setMentors(prev => prev.map(m =>
        m.user_id === id
          ? { ...m, approval_status: 'pending' as const, is_active: false, rejection_reason: null }
          : m,
      ))
      const body = await res.json().catch(() => ({}))
      alert(`Rejection failed: ${body.error || 'unknown error'}`)
    }
  }

  // Mentor actions (deactivate / reactivate — post-approval lifecycle only)
  const mentorAction = async (id: string, mentorActionType: string) => {
    setMentors(prev => prev.map(m => {
      if (m.user_id !== id) return m
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

  // Normalise approval_status so old rows (pre-migration) still render
  const statusOf = (m: MentorProfile): 'pending' | 'approved' | 'rejected' =>
    m.approval_status ?? 'pending'

  const pendingCount = mentors.filter(m => statusOf(m) === 'pending').length
  const approvedCount = mentors.filter(m => statusOf(m) === 'approved').length
  const rejectedCount = mentors.filter(m => statusOf(m) === 'rejected').length

  // Filtered mentors — mentorFilter drives both status and is_active slicing
  const filteredMentors = mentors.filter(m => {
    const q = search.toLowerCase()
    const status = statusOf(m)
    const matchesSearch = !q
      || m.headline?.toLowerCase().includes(q)
      || m.expertise?.toLowerCase().includes(q)
      || getDisplayName(m.user_id).toLowerCase().includes(q)
    const matchesFilter = mentorFilter === 'all'
      || (mentorFilter === 'pending' && status === 'pending')
      || (mentorFilter === 'approved' && status === 'approved')
      || (mentorFilter === 'rejected' && status === 'rejected')
      || (mentorFilter === 'active' && m.is_active && status === 'approved')
      || (mentorFilter === 'inactive' && !m.is_active && status === 'approved')
    return matchesSearch && matchesFilter
  })

  // Sort so pending rise to the top when viewing the default "pending" filter
  filteredMentors.sort((a, b) => {
    const aP = statusOf(a) === 'pending' ? 0 : 1
    const bP = statusOf(b) === 'pending' ? 0 : 1
    if (aP !== bP) return aP - bP
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
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
          {pendingCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center bg-amber-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1">
              {pendingCount}
            </span>
          )}
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
            { id: 'pending',  label: `⏳ Pending (${pendingCount})` },
            { id: 'approved', label: `✓ Approved (${approvedCount})` },
            { id: 'rejected', label: `✗ Rejected (${rejectedCount})` },
            { id: 'all',      label: `All (${mentors.length})` },
          ]} />
          <div className="space-y-3">
            {filteredMentors.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {mentorFilter === 'pending' ? 'No pending mentor applications — inbox zero 🌱' : 'No mentor profiles found.'}
              </p>
            )}
            {filteredMentors.map(m => {
              const status = statusOf(m)
              return (
                <div
                  key={m.user_id}
                  className={`bg-white dark:bg-gray-900 border rounded-lg p-4 flex items-start justify-between gap-4 ${
                    status === 'pending'
                      ? 'border-amber-200 dark:border-amber-800'
                      : status === 'rejected'
                        ? 'border-red-200 dark:border-red-800'
                        : 'border-gray-200 dark:border-gray-800'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 dark:text-gray-100">{getDisplayName(m.user_id)}</span>
                      {status === 'pending' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">⏳ Pending review</span>
                      )}
                      {status === 'approved' && (
                        m.is_active ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">✓ Approved · Active</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">Approved · Paused</span>
                        )
                      )}
                      {status === 'rejected' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">✗ Rejected</span>
                      )}
                      {m.availability && status === 'approved' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 capitalize">{m.availability}</span>
                      )}
                    </div>
                    {m.headline && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{m.headline}</p>}
                    {m.expertise && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Expertise: {m.expertise}</p>}
                    {status === 'rejected' && m.rejection_reason && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1 italic">
                        Reason: {m.rejection_reason}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {status === 'pending' ? 'Submitted' : 'Updated'} {fmt(m.updated_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {status === 'pending' && (
                      <>
                        <button
                          onClick={() => approveMentor(m.user_id)}
                          className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700 font-medium"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => rejectMentor(m.user_id)}
                          className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-3 py-1.5 rounded-md hover:bg-red-200 dark:hover:bg-red-900/50 font-medium"
                        >
                          ✗ Reject
                        </button>
                      </>
                    )}
                    {status === 'rejected' && (
                      <button
                        onClick={() => approveMentor(m.user_id)}
                        className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700 font-medium"
                        title="Re-approve after the applicant has updated their profile"
                      >
                        ✓ Approve now
                      </button>
                    )}
                    {status === 'approved' && (
                      m.is_active ? (
                        <button onClick={() => mentorAction(m.user_id, 'deactivate')} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700">Deactivate</button>
                      ) : (
                        <button onClick={() => mentorAction(m.user_id, 'reactivate')} className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-md hover:bg-green-200">Reactivate</button>
                      )
                    )}
                    <a
                      href={`/directory/${m.user_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      View Profile
                    </a>
                  </div>
                </div>
              )
            })}
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
