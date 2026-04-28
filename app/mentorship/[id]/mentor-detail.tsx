'use client'

import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import MessageButton from '@/app/components/MessageButton'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

type MentorProfile = Database['public']['Tables']['mentor_profiles']['Row']
type ProfileSnippet = {
  first_name: string | null
  last_name: string | null
  role: string | null
  institution: string | null
  avatar_url: string | null
  is_verified: boolean | null
  bio: string | null
}
export type MentorWithProfile = MentorProfile & { profiles: ProfileSnippet | ProfileSnippet[] | null }

type ReviewRow = Database['public']['Tables']['mentorship_reviews']['Row']
export type MentorReview = ReviewRow & {
  profiles: { first_name: string | null; last_name: string | null; avatar_url: string | null } | { first_name: string | null; last_name: string | null; avatar_url: string | null }[] | null
}

interface Props {
  mentor: MentorWithProfile
  reviews: MentorReview[]
  avgRating: number | null
  sessionCount: number
  existingSession: { id: string; status: string } | null
  userId: string
}

function pickProfile<T>(p: T | T[] | null | undefined): T | null {
  if (!p) return null
  return Array.isArray(p) ? (p[0] ?? null) : p
}

export default function MentorDetail({ mentor, reviews, avgRating, sessionCount, existingSession, userId }: Props) {
  const supabase = createClient() as SupabaseClient<Database>
  const [showRequest, setShowRequest] = useState(false)
  const [topic, setTopic] = useState('')
  const [message, setMessage] = useState('')
  const [format, setFormat] = useState((mentor.session_format && mentor.session_format[0]) || 'video')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const profile = pickProfile(mentor.profiles)
  const name = `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || 'Mentor'
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  const isOwnProfile = mentor.user_id === userId

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setErrorMsg(null)

    const { error } = await supabase.from('mentorship_requests').insert({
      mentor_id: mentor.user_id,
      mentee_id: userId,
      topic: topic.trim(),
      message: message.trim() || null,
      goals: `Preferred format: ${format}`,
      status: 'pending',
    })

    if (error) {
      console.error('Mentorship session insert error:', error)
      setErrorMsg(error.message || 'Could not send request. Please try again.')
      setSending(false)
      return
    }

    // Notification to the mentor is created server-side by the DB trigger
    // `trg_on_mentorship_request` on public.mentorship_requests INSERT.
    // Do NOT also POST to /api/mentorship/sessions — that would dupe the notification.

    setSent(true)
    setSending(false)
  }

  return (
    <div>
      {/* Back link */}
      <Link href="/mentorship" className="text-sm text-green-600 hover:underline mb-6 inline-block">
        ← Back to mentors
      </Link>

      {/* Profile header */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-6">
        <div className="flex items-start gap-5">
          {profile?.avatar_url ? (
            <Image src={profile.avatar_url} alt={name} width={80} height={80} className="w-20 h-20 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 font-bold text-2xl shrink-0">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{name}</h1>
              {profile?.is_verified && <span className="text-green-500" title="Verified">✓</span>}
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{mentor.headline}</p>
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
              {profile?.role && <span>{profile.role}</span>}
              {profile?.institution && <span>{profile.institution}</span>}
              {mentor.location && <span>📍 {mentor.location}</span>}
              {mentor.years_experience !== null && mentor.years_experience > 0 && <span>{mentor.years_experience} years experience</span>}
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 mt-4">
              {avgRating !== null && (
                <div className="text-sm">
                  <span className="font-bold text-yellow-600 dark:text-yellow-500">★ {avgRating}</span>
                  <span className="text-gray-400 ml-1">({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
                </div>
              )}
              <div className="text-sm text-gray-500">
                {sessionCount} session{sessionCount !== 1 ? 's' : ''} completed
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
  mentor.availability === 'Open'    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
  mentor.availability === 'Limited' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
  mentor.availability === 'Waitlist' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' :
                                      'bg-gray-100 dark:bg-gray-800 text-gray-500'
}`}>
  {mentor.availability === 'Open' ? 'Open' : mentor.availability === 'Limited' ? 'Limited' : mentor.availability === 'Waitlist' ? 'Waitlist' : 'Closed'}
</span>
            </div>
          </div>
        </div>

        {/* Bio */}
        {mentor.bio && (
          <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">About</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">{mentor.bio}</p>
          </div>
        )}

        {/* Expertise + Details */}
        <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Expertise</h3>
            <div className="flex flex-wrap gap-1.5">
              {(mentor.expertise ?? []).map((tag) => (
                <span key={tag} className="text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Session Formats</h3>
            <div className="flex flex-wrap gap-1.5">
              {(mentor.session_format ?? []).map((f) => (
                <span key={f} className="text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2.5 py-1 rounded-full capitalize">
                  {f.replace('_', ' ')}
                </span>
              ))}
            </div>
            {mentor.languages && mentor.languages.length > 0 && (
              <p className="text-xs text-gray-500 mt-2">Languages: {mentor.languages.join(', ')}</p>
            )}
          </div>
        </div>

        {/* LinkedIn link */}
        {mentor.linkedin_url && (
          <div className="mt-4">
            <a href={mentor.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
              View LinkedIn Profile →
            </a>
          </div>
        )}

        {/* Message mentor */}
        {!isOwnProfile && (
          <div className="mt-4">
            <MessageButton
              recipientId={mentor.user_id}
              label="Message Mentor"
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg border border-green-600 text-green-600 hover:bg-green-600 hover:text-white transition-colors disabled:opacity-50"
            />
          </div>
        )}

        {/* Request session button */}
        {!isOwnProfile && mentor.availability !== 'Closed' && (
          <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800">
            {existingSession ? (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-sm text-yellow-800 dark:text-yellow-300">
                You have a <strong>{existingSession.status}</strong> request with {name}.{' '}
                <Link href="/mentorship/sessions" className="underline">View requests →</Link>
              </div>
            ) : sent ? (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-sm text-green-800 dark:text-green-300">
                Session request sent! {name} will review your request and respond.{' '}
                <Link href="/mentorship/sessions" className="underline">View requests →</Link>
              </div>
            ) : !showRequest ? (
              <button
                onClick={() => setShowRequest(true)}
                className="bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
              >
                Request a Session
              </button>
            ) : (
              <form onSubmit={handleRequest} className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Request a Mentorship Session</h3>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Topic <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="What would you like guidance on?"
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    required
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Message (optional)</label>
                  <textarea
                    placeholder="Tell the mentor about your background and what you hope to achieve..."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Preferred Format</label>
                  <select
                    value={format}
                    onChange={e => setFormat(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {(mentor.session_format ?? []).map((f) => (
                      <option key={f} value={f}>{f.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
                {errorMsg && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
                    {errorMsg}
                  </div>
                )}
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowRequest(false)}
                    className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium py-2 rounded-lg">
                    Cancel
                  </button>
                  <button type="submit" disabled={sending || !topic.trim()}
                    className="flex-1 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold py-2 rounded-lg disabled:opacity-50">
                    {sending ? 'Sending...' : 'Send Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {isOwnProfile && (
          <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800">
            <Link href="/mentorship/become-mentor" className="text-sm text-green-600 hover:underline font-medium">
              Edit your mentor profile →
            </Link>
          </div>
        )}
      </div>

      {/* Reviews */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Reviews {reviews.length > 0 && <span className="text-gray-400 font-normal text-sm">({reviews.length})</span>}
        </h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-gray-400">No reviews yet.</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => {
              const rProfile = pickProfile(r.profiles)
              const rName = `${rProfile?.first_name ?? ''} ${rProfile?.last_name ?? ''}`.trim() || 'Anonymous'
              const rating = r.rating ?? 0
              return (
                <div key={r.id} className="border-b border-gray-100 dark:border-gray-800 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    {rProfile?.avatar_url ? (
                      <Image src={rProfile.avatar_url} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-500">
                        {rName[0]}
                      </div>
                    )}
                    <div>
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{rName}</span>
                      <span className="text-yellow-500 ml-2 text-sm">{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</span>
                    </div>
                    <span className="text-xs text-gray-400 ml-auto">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                    </span>
                  </div>
                  {r.comment && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 ml-11">{r.comment}</p>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
