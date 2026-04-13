'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AppNav from '@/app/components/AppNav'
import Link from 'next/link'

// Shape of a row in public.mentorship_sessions we care about
interface Session {
  id: string
  request_id: string
  scheduled_at: string
  duration_mins: number
  format: string | null
  meeting_link: string | null
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  notes: string | null
  completed_at: string | null
}

// Shape of a row in public.mentorship_reviews — used on completed sessions
interface Review {
  id: string
  session_id: string
  reviewer_id: string
  reviewee_id: string
  rating: number
  comment: string | null
  created_at: string
}

// A row from public.mentorship_requests + joined profile + latest active session
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
  mentor_profile?: { first_name: string | null; last_name: string | null; avatar_url: string | null }
  mentee_profile?: { first_name: string | null; last_name: string | null; avatar_url: string | null }
  session?: Session   // latest non-cancelled session for this request, if any
  my_review?: Review      // review I (current user) left on this session
  their_review?: Review   // review the other party left on this session
}

// Status colours match the mentorship_request_status enum exactly
const STATUS_LABELS: Record<Request['status'], { label: string; color: string }> = {
  pending:   { label: 'Pending',   color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' },
  accepted:  { label: 'Accepted',  color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  declined:  { label: 'Declined',  color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
  withdrawn: { label: 'Withdrawn', color: 'bg-gray-100 dark:bg-gray-800 text-gray-500' },
  completed: { label: 'Completed', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
}

// Format options — should ideally come from the mentor's profile, but for now a sensible default
const FORMAT_OPTIONS = ['video', 'voice', 'chat', 'in_person']

// Extract "Preferred format: X" from the goals field (set by the request form)
function parsePreferredFormat(goals: string | null): string | null {
  if (!goals) return null
  const match = goals.match(/Preferred format:\s*([a-z_]+)/i)
  return match ? match[1] : null
}

// For datetime-local input: produce a local-tz ISO-ish string usable as value
function toDateTimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
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

  // Schedule-session modal
  const [scheduleTarget, setScheduleTarget] = useState<Request | null>(null)
  const [scheduledAt, setScheduledAt] = useState('')     // datetime-local value
  const [duration, setDuration] = useState(60)
  const [format, setFormat] = useState('video')
  const [meetingLink, setMeetingLink] = useState('')
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false)

  // Review modal
  const [reviewTarget, setReviewTarget] = useState<Request | null>(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userIds = [...new Set(data.flatMap((r: any) => [r.mentor_id, r.mentee_id]))]
        const requestIds = data.map((r: { id: string }) => r.id)

        // Profiles + active sessions in parallel
        const [profilesRes, sessionsRes] = await Promise.all([
          supabase.from('profiles').select('id, first_name, last_name, avatar_url').in('id', userIds as string[]),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any).from('mentorship_sessions')
            .select('*')
            .in('request_id', requestIds)
            .neq('status', 'cancelled')
            .order('scheduled_at', { ascending: true }),
        ])

        // Now that we know which sessions exist, fetch any reviews against them.
        // RLS restricts this to reviews where the current user is reviewer or reviewee — exactly what we want.
        const sessionIds = ((sessionsRes.data ?? []) as { id: string }[]).map(s => s.id)
        let reviewsData: Review[] = []
        if (sessionIds.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: rd } = await (supabase as any)
            .from('mentorship_reviews')
            .select('*')
            .in('session_id', sessionIds)
          reviewsData = (rd ?? []) as Review[]
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const profileMap: Record<string, any> = {}
        for (const p of profilesRes.data ?? []) profileMap[(p as { id: string }).id] = p

        // Most recent non-cancelled session per request
        const sessionMap: Record<string, Session> = {}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const s of (sessionsRes.data ?? []) as any[]) {
          // Later rows overwrite earlier — effectively the latest scheduled_at wins
          sessionMap[s.request_id] = s as Session
        }

        // Bucket reviews per session, split by reviewer-is-me vs reviewer-is-other
        const myReviewBySession: Record<string, Review> = {}
        const theirReviewBySession: Record<string, Review> = {}
        for (const rv of reviewsData) {
          if (rv.reviewer_id === user.id) myReviewBySession[rv.session_id] = rv
          else                            theirReviewBySession[rv.session_id] = rv
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const enriched: Request[] = data.map((r: any) => {
          const s = sessionMap[r.id]
          return {
            ...r,
            mentor_profile: profileMap[r.mentor_id],
            mentee_profile: profileMap[r.mentee_id],
            session: s,
            my_review:    s ? myReviewBySession[s.id]    : undefined,
            their_review: s ? theirReviewBySession[s.id] : undefined,
          }
        })
        setRequests(enriched)

        // Default the tab to whichever side the user has more activity on
        const mentorCount = enriched.filter(r => r.mentor_id === user.id).length
        const menteeCount = enriched.filter(r => r.mentee_id === user.id).length
        if (mentorCount > menteeCount) setTab('mentor')
      }
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Generic status update on a request — returns true on success
  async function updateRequestStatus(requestId: string, status: Request['status'], responseNote?: string) {
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
      r.id === requestId ? { ...r, status, response_note: (patch.response_note as string | null) ?? r.response_note } : r
    ))
    setUpdating(null)
    return true
  }

  async function handleAccept(r: Request)   { await updateRequestStatus(r.id, 'accepted') }
  async function handleWithdraw(r: Request) { await updateRequestStatus(r.id, 'withdrawn') }

  async function handleDeclineSubmit() {
    if (!declineTarget) return
    const ok = await updateRequestStatus(declineTarget.id, 'declined', declineNote)
    if (ok) { setDeclineTarget(null); setDeclineNote('') }
  }

  // Open schedule modal — prefill defaults from mentor's preferred format if known
  function openScheduleModal(r: Request) {
    const preferred = parsePreferredFormat(r.goals)
    const oneWeekFromNow = new Date()
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7)
    oneWeekFromNow.setMinutes(0, 0, 0)
    setScheduleTarget(r)
    setScheduledAt(toDateTimeLocalValue(oneWeekFromNow))
    setDuration(60)
    setFormat(preferred && FORMAT_OPTIONS.includes(preferred) ? preferred : 'video')
    setMeetingLink('')
  }

  async function handleScheduleSubmit() {
    if (!scheduleTarget || !scheduledAt) return
    setScheduleSubmitting(true)

    const payload = {
      request_id: scheduleTarget.id,
      scheduled_at: new Date(scheduledAt).toISOString(),
      duration_mins: duration,
      format,
      meeting_link: meetingLink.trim() || null,
      status: 'scheduled' as const,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: inserted, error } = await (supabase as any)
      .from('mentorship_sessions')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('Session insert failed:', error)
      alert(`Could not schedule session: ${error.message}`)
      setScheduleSubmitting(false)
      return
    }

    // Attach the new session to the request locally so the card refreshes
    setRequests(prev => prev.map(r =>
      r.id === scheduleTarget.id ? { ...r, session: inserted as Session } : r
    ))
    setScheduleTarget(null)
    setScheduleSubmitting(false)
  }

  // Mark a session completed — cascades to the request
  async function handleCompleteSession(r: Request) {
    if (!r.session) {
      // No session yet — just complete the request (interim path, same as before)
      await updateRequestStatus(r.id, 'completed')
      return
    }
    setUpdating(r.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: sErr } = await (supabase as any)
      .from('mentorship_sessions')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', r.session.id)
    if (sErr) {
      console.error('Session complete failed:', sErr)
      alert(`Could not mark session completed: ${sErr.message}`)
      setUpdating(null)
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: rErr } = await (supabase as any)
      .from('mentorship_requests')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', r.id)
    if (rErr) {
      console.error('Request complete failed:', rErr)
      alert(`Session marked complete but could not update request: ${rErr.message}`)
      setUpdating(null)
      return
    }

    setRequests(prev => prev.map(x =>
      x.id === r.id
        ? { ...x, status: 'completed', session: x.session ? { ...x.session, status: 'completed', completed_at: new Date().toISOString() } : x.session }
        : x
    ))
    setUpdating(null)
  }

  // Cancel a scheduled session — request remains accepted so mentor can re-schedule
  async function handleCancelSession(r: Request) {
    if (!r.session) return
    if (!confirm('Cancel this scheduled session? The request will remain open for re-scheduling.')) return
    setUpdating(r.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('mentorship_sessions')
      .update({ status: 'cancelled' })
      .eq('id', r.session.id)
    if (error) {
      console.error('Session cancel failed:', error)
      alert(`Could not cancel session: ${error.message}`)
      setUpdating(null)
      return
    }
    setRequests(prev => prev.map(x => x.id === r.id ? { ...x, session: undefined } : x))
    setUpdating(null)
  }

  // Open review modal — prefills with a 5-star default
  function openReviewModal(r: Request) {
    setReviewTarget(r)
    setReviewRating(5)
    setReviewComment('')
  }

  async function handleReviewSubmit() {
    if (!reviewTarget || !reviewTarget.session || !userId) return
    setReviewSubmitting(true)

    const revieweeId = userId === reviewTarget.mentor_id ? reviewTarget.mentee_id : reviewTarget.mentor_id
    const payload = {
      session_id: reviewTarget.session.id,
      reviewer_id: userId,
      reviewee_id: revieweeId,
      rating: reviewRating,
      comment: reviewComment.trim() || null,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: inserted, error } = await (supabase as any)
      .from('mentorship_reviews')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('Review insert failed:', error)
      alert(`Could not submit review: ${error.message}`)
      setReviewSubmitting(false)
      return
    }

    // Attach locally so the UI refreshes without a reload
    setRequests(prev => prev.map(x =>
      x.id === reviewTarget.id ? { ...x, my_review: inserted as Review } : x
    ))
    setReviewTarget(null)
    setReviewSubmitting(false)
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
              Track mentorship requests you&apos;ve sent and received, and schedule sessions.
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
                          {preferredFormat && <span className="capitalize">Preferred format: {preferredFormat.replace('_', ' ')}</span>}
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

                  {/* Scheduled session panel — shows on accepted requests that have an active session */}
                  {r.session && r.status !== 'declined' && r.status !== 'withdrawn' && (
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 rounded-lg">
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-xs text-blue-800 dark:text-blue-300 space-y-0.5">
                          <div className="font-semibold">
                            {r.session.status === 'completed' ? 'Completed session' : 'Scheduled session'}
                          </div>
                          <div>
                            📅 {new Date(r.session.scheduled_at).toLocaleString('en-GB', {
                              day: '2-digit', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                              timeZone: 'Africa/Lagos', timeZoneName: 'short',
                            })}
                          </div>
                          <div>
                            ⏱ {r.session.duration_mins} mins
                            {r.session.format && <> · <span className="capitalize">{r.session.format.replace('_', ' ')}</span></>}
                          </div>
                          {r.session.meeting_link && (
                            <a
                              href={r.session.meeting_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-700 dark:text-blue-400 hover:underline break-all"
                            >
                              🔗 Join meeting
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

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

                  {/* Accepted request without a scheduled session — mentor schedules */}
                  {tab === 'mentor' && r.status === 'accepted' && !r.session && (
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-2 items-center">
                      <button
                        onClick={() => openScheduleModal(r)}
                        disabled={updating === r.id}
                        className="text-xs font-semibold bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        Schedule Session
                      </button>
                      <button
                        onClick={() => handleCompleteSession(r)}
                        disabled={updating === r.id}
                        className="text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 px-4 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                      >
                        Mark Completed
                      </button>
                    </div>
                  )}

                  {/* Accepted request on the mentee side without a scheduled session */}
                  {tab === 'mentee' && r.status === 'accepted' && !r.session && (
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                      <p className="text-[11px] text-gray-400">
                        Waiting for {otherName} to schedule a session. You can coordinate via Messages.
                      </p>
                    </div>
                  )}

                  {/* Accepted request WITH a scheduled (not completed) session — either party can act */}
                  {r.status === 'accepted' && r.session && r.session.status === 'scheduled' && (
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex gap-2">
                      <button
                        onClick={() => handleCompleteSession(r)}
                        disabled={updating === r.id}
                        className="text-xs font-semibold bg-green-700 text-white px-4 py-1.5 rounded-lg hover:bg-green-800 disabled:opacity-50"
                      >
                        Mark Completed
                      </button>
                      <button
                        onClick={() => handleCancelSession(r)}
                        disabled={updating === r.id}
                        className="text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 px-4 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                      >
                        Cancel Session
                      </button>
                    </div>
                  )}

                  {/* Completed request — reviews */}
                  {r.status === 'completed' && (
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
                      {/* My review of the other party */}
                      {r.my_review ? (
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/40 rounded-lg">
                          <p className="text-[11px] font-semibold text-green-800 dark:text-green-300 mb-1">
                            Your review of {otherName}
                          </p>
                          <p className="text-sm text-yellow-500">
                            {'★'.repeat(r.my_review.rating)}
                            <span className="text-gray-300 dark:text-gray-700">{'★'.repeat(5 - r.my_review.rating)}</span>
                          </p>
                          {r.my_review.comment && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic">&ldquo;{r.my_review.comment}&rdquo;</p>
                          )}
                        </div>
                      ) : r.session ? (
                        <button
                          onClick={() => openReviewModal(r)}
                          className="text-xs font-semibold bg-yellow-500 text-white px-4 py-1.5 rounded-lg hover:bg-yellow-600"
                        >
                          ★ Leave Review
                        </button>
                      ) : (
                        <p className="text-[11px] text-gray-400">Completed without a scheduled session — no review possible.</p>
                      )}

                      {/* Their review of me */}
                      {r.their_review && (
                        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-lg">
                          <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            {otherName}&apos;s review of you
                          </p>
                          <p className="text-sm text-yellow-500">
                            {'★'.repeat(r.their_review.rating)}
                            <span className="text-gray-300 dark:text-gray-700">{'★'.repeat(5 - r.their_review.rating)}</span>
                          </p>
                          {r.their_review.comment && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic">&ldquo;{r.their_review.comment}&rdquo;</p>
                          )}
                        </div>
                      )}
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

        {/* Schedule modal */}
        {scheduleTarget && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6">
              <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">Schedule Mentorship Session</h2>
              <p className="text-sm text-gray-500 mb-4">
                Set a date, format and (optional) meeting link. The mentee will see the details immediately.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Date &amp; Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={e => setScheduledAt(e.target.value)}
                    required
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Duration (mins)</label>
                    <input
                      type="number"
                      min={15}
                      max={240}
                      step={15}
                      value={duration}
                      onChange={e => setDuration(Number(e.target.value))}
                      className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Format</label>
                    <select
                      value={format}
                      onChange={e => setFormat(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      {FORMAT_OPTIONS.map(f => (
                        <option key={f} value={f}>{f.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Meeting Link (optional)
                  </label>
                  <input
                    type="url"
                    value={meetingLink}
                    onChange={e => setMeetingLink(e.target.value)}
                    placeholder="https://meet.google.com/..., https://zoom.us/j/..."
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">You can add this later and the mentee will see it automatically.</p>
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setScheduleTarget(null)}
                  disabled={scheduleSubmitting}
                  className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium py-2 rounded-lg disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleScheduleSubmit}
                  disabled={scheduleSubmitting || !scheduledAt}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 rounded-lg disabled:opacity-50"
                >
                  {scheduleSubmitting ? 'Scheduling…' : 'Schedule Session'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Review modal */}
        {reviewTarget && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6">
              <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">Leave a Review</h2>
              <p className="text-sm text-gray-500 mb-4">
                Your review is visible to the other party and helps build trust in the mentorship network.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Rating <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setReviewRating(n)}
                        className={`text-3xl transition-colors ${
                          n <= reviewRating ? 'text-yellow-500' : 'text-gray-300 dark:text-gray-700 hover:text-yellow-300'
                        }`}
                        aria-label={`${n} star${n > 1 ? 's' : ''}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Comment (optional)
                  </label>
                  <textarea
                    value={reviewComment}
                    onChange={e => setReviewComment(e.target.value)}
                    rows={4}
                    placeholder="What went well? What could be improved?"
                    maxLength={500}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">{reviewComment.length}/500</p>
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setReviewTarget(null)}
                  disabled={reviewSubmitting}
                  className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium py-2 rounded-lg disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReviewSubmit}
                  disabled={reviewSubmitting || reviewRating < 1}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-semibold py-2 rounded-lg disabled:opacity-50"
                >
                  {reviewSubmitting ? 'Submitting…' : 'Submit Review'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
