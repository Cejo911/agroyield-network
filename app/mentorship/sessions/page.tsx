'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AppNav from '@/app/components/AppNav'
import Link from 'next/link'

interface Session {
  id: string
  mentor_id: string
  mentee_id: string
  status: string
  topic: string
  message: string | null
  session_date: string | null
  session_format: string
  duration_minutes: number
  mentor_notes: string | null
  mentee_notes: string | null
  created_at: string
  // Joined
  mentor_profile?: { first_name: string; last_name: string; avatar_url: string | null }
  mentee_profile?: { first_name: string; last_name: string; avatar_url: string | null }
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Pending',   color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  completed: { label: 'Completed', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 dark:bg-gray-800 text-gray-500' },
  declined:  { label: 'Declined',  color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
}

export default function SessionsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'mentee' | 'mentor'>('mentee')
  const [updating, setUpdating] = useState<string | null>(null)

  // Review modal
  const [reviewSession, setReviewSession] = useState<Session | null>(null)
  const [rating, setRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      // Fetch all sessions where user is mentor or mentee
      const { data } = await supabase
        .from('mentorship_sessions')
        .select('*')
        .or(`mentor_id.eq.${user.id},mentee_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (data && data.length > 0) {
        // Get all unique user IDs to fetch profiles
        const userIds = [...new Set(data.flatMap(s => [s.mentor_id, s.mentee_id]))]
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url')
          .in('id', userIds)

        const profileMap: Record<string, any> = {}
        for (const p of profiles ?? []) profileMap[p.id] = p

        const enriched = data.map(s => ({
          ...s,
          mentor_profile: profileMap[s.mentor_id],
          mentee_profile: profileMap[s.mentee_id],
        }))
        setSessions(enriched)

        // If user has mentor sessions, default to mentor tab
        if (enriched.some(s => s.mentor_id === user.id)) {
          // Check if they have more mentor sessions
          const mentorCount = enriched.filter(s => s.mentor_id === user.id).length
          const menteeCount = enriched.filter(s => s.mentee_id === user.id).length
          if (mentorCount > menteeCount) setTab('mentor')
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  async function updateStatus(sessionId: string, status: string) {
    setUpdating(sessionId)
    await supabase.from('mentorship_sessions').update({ status, updated_at: new Date().toISOString() }).eq('id', sessionId)
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status } : s))
    setUpdating(null)
  }

  async function submitReview() {
    if (!reviewSession || !userId) return
    setSubmittingReview(true)
    const revieweeId = tab === 'mentee' ? reviewSession.mentor_id : reviewSession.mentee_id

    await supabase.from('mentorship_reviews').insert({
      session_id: reviewSession.id,
      reviewer_id: userId,
      reviewee_id: revieweeId,
      rating,
      comment: reviewComment.trim() || null,
    })

    setSubmittingReview(false)
    setReviewSession(null)
    setRating(5)
    setReviewComment('')
  }

  const displayed = sessions.filter(s => tab === 'mentee' ? s.mentee_id === userId : s.mentor_id === userId)

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <div className="text-gray-400 text-sm p-8 text-center">Loading sessions...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Sessions</h1>
            <p className="text-sm text-gray-500 mt-0.5">Track your mentorship sessions as a mentor and mentee.</p>
          </div>
          <Link href="/mentorship" className="text-sm text-green-600 hover:underline font-medium">Browse Mentors →</Link>
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
                ({sessions.filter(s => t === 'mentee' ? s.mentee_id === userId : s.mentor_id === userId).length})
              </span>
            </button>
          ))}
        </div>

        {/* Sessions list */}
        {displayed.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            {tab === 'mentee'
              ? <>No sessions yet. <Link href="/mentorship" className="text-green-600 hover:underline">Find a mentor</Link> to get started.</>
              : <>No mentee requests yet. Make sure your <Link href="/mentorship/become-mentor" className="text-green-600 hover:underline">mentor profile</Link> is active.</>
            }
          </div>
        ) : (
          <div className="space-y-3">
            {displayed.map(s => {
              const otherProfile = tab === 'mentee' ? s.mentor_profile : s.mentee_profile
              const otherName = otherProfile ? `${otherProfile.first_name} ${otherProfile.last_name}`.trim() : 'Unknown'
              const otherId = tab === 'mentee' ? s.mentor_id : s.mentee_id
              const status = STATUS_LABELS[s.status] || { label: s.status, color: 'bg-gray-100 text-gray-500' }

              return (
                <div key={s.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      {otherProfile?.avatar_url ? (
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
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 font-medium">{s.topic}</p>
                        {s.message && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{s.message}</p>}
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                          <span className="capitalize">{s.session_format.replace('_', ' ')}</span>
                          <span>{new Date(s.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${status.color}`}>
                      {status.label}
                    </span>
                  </div>

                  {/* Mentor actions for pending sessions */}
                  {tab === 'mentor' && s.status === 'pending' && (
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex gap-2">
                      <button
                        onClick={() => updateStatus(s.id, 'confirmed')}
                        disabled={updating === s.id}
                        className="text-xs font-semibold bg-green-700 text-white px-4 py-1.5 rounded-lg hover:bg-green-800 disabled:opacity-50"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => updateStatus(s.id, 'declined')}
                        disabled={updating === s.id}
                        className="text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 px-4 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </div>
                  )}

                  {/* Mark complete + Cancel for confirmed sessions */}
                  {s.status === 'confirmed' && (
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex gap-2">
                      <button
                        onClick={() => updateStatus(s.id, 'completed')}
                        disabled={updating === s.id}
                        className="text-xs font-semibold bg-green-700 text-white px-4 py-1.5 rounded-lg hover:bg-green-800 disabled:opacity-50"
                      >
                        Mark Completed
                      </button>
                      <button
                        onClick={() => updateStatus(s.id, 'cancelled')}
                        disabled={updating === s.id}
                        className="text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 px-4 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {/* Review button for completed sessions */}
                  {s.status === 'completed' && (
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                      <button
                        onClick={() => setReviewSession(s)}
                        className="text-xs font-semibold text-green-600 hover:underline"
                      >
                        Leave a Review →
                      </button>
                    </div>
                  )}

                  {/* Cancel for pending (mentee) */}
                  {tab === 'mentee' && s.status === 'pending' && (
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                      <button
                        onClick={() => updateStatus(s.id, 'cancelled')}
                        disabled={updating === s.id}
                        className="text-xs font-semibold text-gray-500 hover:text-red-500"
                      >
                        Cancel Request
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Review Modal */}
        {reviewSession && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6">
              <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Leave a Review</h2>
              <p className="text-sm text-gray-500 mb-4">Session: {reviewSession.topic}</p>

              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      className={`text-2xl ${n <= rating ? 'text-yellow-500' : 'text-gray-300 dark:text-gray-600'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Comment (optional)</label>
                <textarea
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  rows={3}
                  placeholder="How was your experience?"
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setReviewSession(null)}
                  className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium py-2 rounded-lg">
                  Cancel
                </button>
                <button onClick={submitReview} disabled={submittingReview}
                  className="flex-1 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold py-2 rounded-lg disabled:opacity-50">
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
