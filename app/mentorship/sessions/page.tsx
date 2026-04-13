'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AppNav from '@/app/components/AppNav'
import Link from 'next/link'

// A row from public.mentorship_requests + joined profile info we fetch client-side
interface Request {
  id: string
  mentor_id: string
  mentee_id: string
  topic: string | null
  message: string | null
  goals: string | null
  status: 'pending' | 'accepted' | 'declined' | 'withdrawn' | 'completed'
  response_note: string | null
  created_at: string
  // Joined client-side
  mentor_profile?: { first_name: string | null; last_name: string | null; avatar_url: string | null }
  mentee_profile?: { first_name: string | null; last_name: string | null; avatar_url: string | null }
}

// Status colours match the enum exactly
const STATUS_LABELS: Record<Request['status'], { label: string; color: string }> = {
  pending:   { label: 'Pending',   color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' },
  accepted:  { label: 'Accepted',  color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  declined:  { label: 'Declined',  color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
  withdrawn: { label: 'Withdrawn', color: 'bg-gray-100 dark:bg-gray-800 text-gray-500' },
  completed: { label: 'Completed', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
}

// Extract "Preferred format: X" from the goals field (set by the request form)
function parsePreferredFormat(goals: string | null): string | null {
  if (!goals) return null
  const match = goals.match(/Preferred format:\s*([a-z_]+)/i)
  return match ? match[1].replace('_', ' ') : null
}

export default function RequestsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'mentee' | 'mentor'>('mentee')
  const [updating, setUpdating] = useState<string | null>(null)

  // Decline-with-note modal
  const [declineTarget, setDeclineTarget] = useState<Request | null>(null)
  const [declineNote, setDeclineNote] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      // Fetch all mentorship requests where user is mentor or mentee
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('mentorship_requests')
        .select('*')
        .or(`mentor_id.eq.${user.id},mentee_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (data && data.length > 0) {
        // Fetch profile info for every distinct user id referenced
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userIds = [...new Set(data.flatMap((r: any) => [r.mentor_id, r.mentee_id]))]
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url')
          .in('id', userIds as string[])

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const profileMap: Record<string, any> = {}
        for (const p of profiles ?? []) profileMap[(p as { id: string }).id] = p

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const enriched: Request[] = data.map((r: any) => ({
          ...r,
          mentor_profile: profileMap[r.mentor_id],
          mentee_profile: profileMap[r.mentee_id],
        }))
        setRequests(enriched)

        // If the user is mainly a mentor, default the tab there
        const mentorCount = enriched.filter(r => r.mentor_id === user.id).length
        const menteeCount = enriched.filter(r => r.mentee_id === user.id).length
        if (mentorCount > menteeCount) setTab('mentor')
      }
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Generic status update — returns true on success
  async function updateStatus(requestId: string, status: Request['status'], responseNote?: string) {
    setUpdating(requestId)
    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
    if (typeof responseNote === 'string') patch.response_note = responseNote.trim() || null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('mentorship_requests').update(patch).eq('id', requestId)
    if (error) {
      console.error('Request status update failed:', error)
      alert(`Could not update request: ${error.message}`)
      setUpdating(null)
      return false
    }

    setRequests(prev => prev.map(r =>
      r.id === requestId ? { ...r, status, response_note: patch.response_note as string | null ?? r.response_note } : r
    ))
    setUpdating(null)
    return true
  }

  async function handleAccept(r: Request)   { await updateStatus(r.id, 'accepted') }
  async function handleWithdraw(r: Request) { await updateStatus(r.id, 'withdrawn') }
  async function handleComplete(r: Request) { await updateStatus(r.id, 'completed') }
  async function handleDeclineSubmit() {
    if (!declineTarget) return
    const ok = await updateStatus(declineTarget.id, 'declined', declineNote)
    if (ok) {
      setDeclineTarget(null)
      setDeclineNote('')
    }
  }

  const displayed = requests.filter(r => tab === 'mentee' ? r.mentee_id === userId : r.mentor_id === userId)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <AppNav />
        <div className="text-gray-400 text-sm p-8 text-center">Loading requests…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Mentorship Requests</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Track mentorship requests you&apos;ve sent and received.
            </p>
          </div>
          <Link href="/mentorship" className="text-sm text-green-600 hover:underline font-medium">
            Browse Mentors →
          </Link>
        </div>

        {/* Tab toggle */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mb-6 w-fit">
          {(['mentee', 'mentor'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-sm font-medium px-4 py-2 rounded-md transition-colors ${
                tab === t ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              As {t === 'mentee' ? 'Mentee' : 'Mentor'}
              <span className="ml-1.5 text-xs text-gray-400">
                ({requests.filter(r => t === 'mentee' ? r.mentee_id === userId : r.mentor_id === userId).length})
              </span>
            </button>
          ))}
        </div>

        {/* Requests list */}
        {displayed.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            {tab === 'mentee'
              ? <>No requests yet. <Link href="/mentorship" className="text-green-600 hover:underline">Find a mentor</Link> to get started.</>
              : <>No incoming requests yet. Make sure your <Link href="/mentorship/become-mentor" className="text-green-600 hover:underline">mentor profile</Link> is active.</>
            }
          </div>
        ) : (
          <div className="space-y-3">
            {displayed.map(r => {
              const otherProfile = tab === 'mentee' ? r.mentor_profile : r.mentee_profile
              const otherName = otherProfile
                ? `${otherProfile.first_name ?? ''} ${otherProfile.last_name ?? ''}`.trim() || 'Unknown'
                : 'Unknown'
              const otherId = tab === 'mentee' ? r.mentor_id : r.mentee_id
              const status = STATUS_LABELS[r.status] ?? { label: r.status, color: 'bg-gray-100 text-gray-500' }
              const preferredFormat = parsePreferredFormat(r.goals)

              return (
                <div key={r.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      {otherProfile?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={otherProfile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-bold text-gray-500 shrink-0">
                          {otherName[0]}
                        </div>
                      )}
                      <div className="min-w-0">
                        <Link href={`/mentorship/${otherId}`} className="font-semibold text-gray-900 dark:text-white hover:text-green-600 text-sm">
                          {otherName}
                        </Link>
                        {r.topic && <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 font-medium">{r.topic}</p>}
                        {r.message && <p className="text-xs text-gray-500 mt-1 line-clamp-3">{r.message}</p>}
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                          {preferredFormat && <span className="capitalize">Preferred format: {preferredFormat}</span>}
                          <span>
                            {new Date(r.created_at).toLocaleDateString('en-GB', {
                              day: '2-digit', month: 'short', year: 'numeric',
                            })}
                          </span>
                        </div>
                        {r.status === 'declined' && r.response_note && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-2 italic">
                            Mentor&apos;s note: {r.response_note}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${status.color}`}>
                      {status.label}
                    </span>
                  </div>

                  {/* Mentor actions on pending */}
                  {tab === 'mentor' && r.status === 'pending' && (
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex gap-2">
                      <button
                        onClick={() => handleAccept(r)}
                        disabled={updating === r.id}
                        className="text-xs font-semibold bg-green-700 text-white px-4 py-1.5 rounded-lg hover:bg-green-800 disabled:opacity-50"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => { setDeclineTarget(r); setDeclineNote('') }}
                        disabled={updating === r.id}
                        className="text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 px-4 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </div>
                  )}

                  {/* Mentee can withdraw a pending request */}
                  {tab === 'mentee' && r.status === 'pending' && (
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                      <button
                        onClick={() => handleWithdraw(r)}
                        disabled={updating === r.id}
                        className="text-xs font-semibold text-gray-500 hover:text-red-500"
                      >
                        Withdraw Request
                      </button>
                    </div>
                  )}

                  {/* Either party can mark an accepted request completed (interim until scheduling UI exists) */}
                  {r.status === 'accepted' && (
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                      <button
                        onClick={() => handleComplete(r)}
                        disabled={updating === r.id}
                        className="text-xs font-semibold bg-green-700 text-white px-4 py-1.5 rounded-lg hover:bg-green-800 disabled:opacity-50"
                      >
                        Mark Completed
                      </button>
                      <p className="text-[11px] text-gray-400 mt-2">
                        Scheduling & meeting links coming soon — for now, coordinate via Messages.
                      </p>
                    </div>
                  )}

                  {/* Completed: review flow to be added when mentorship_reviews table is created */}
                  {r.status === 'completed' && (
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                      <p className="text-[11px] text-gray-400">Reviews coming soon.</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Decline modal */}
        {declineTarget && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6">
              <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">Decline Request</h2>
              <p className="text-sm text-gray-500 mb-4">
                Share an optional note with the mentee — e.g. suggest another mentor or a better time.
              </p>

              <textarea
                value={declineNote}
                onChange={e => setDeclineNote(e.target.value)}
                rows={4}
                placeholder="Optional note to the mentee…"
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none mb-4"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => { setDeclineTarget(null); setDeclineNote('') }}
                  disabled={updating === declineTarget.id}
                  className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium py-2 rounded-lg disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeclineSubmit}
                  disabled={updating === declineTarget.id}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2 rounded-lg disabled:opacity-50"
                >
                  {updating === declineTarget.id ? 'Declining…' : 'Decline Request'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
