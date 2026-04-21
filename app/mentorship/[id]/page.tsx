import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import AppNav from '@/app/components/AppNav'
import MentorDetail from './mentor-detail'

export default async function MentorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch mentor profile with user info. We allow owners to view their own
  // profile while still pending — the detail page doubles as the applicant's
  // preview. For everyone else, approval_status must be 'approved'.
  const isOwnProfile = id === user.id
  let mentorQuery = supabase
    .from('mentor_profiles')
    .select('*, profiles!mentor_profiles_user_id_fkey(first_name, last_name, role, institution, avatar_url, is_verified, bio)')
    .eq('user_id', id)

  if (!isOwnProfile) {
    mentorQuery = mentorQuery.eq('is_active', true).eq('approval_status', 'approved')
  }

  const { data: mentor } = await mentorQuery.single()

  if (!mentor) notFound()

  // Fetch reviews for this mentor
  const { data: reviews } = await supabase
    .from('mentorship_reviews')
    .select('*, profiles!mentorship_reviews_reviewer_id_fkey(first_name, last_name, avatar_url)')
    .eq('reviewee_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  // Compute average rating
  const avgRating = reviews && reviews.length > 0
    ? Math.round((reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length) * 10) / 10
    : null

  // Count completed requests (mentorship_sessions joins via request_id; for now count completed requests)
  const { count: sessionCount } = await supabase
    .from('mentorship_requests')
    .select('*', { count: 'exact', head: true })
    .eq('mentor_id', id)
    .eq('status', 'completed')

  // Check if user already has an open request with this mentor
  const { data: existingSession } = await supabase
    .from('mentorship_requests')
    .select('id, status')
    .eq('mentor_id', id)
    .eq('mentee_id', user.id)
    .in('status', ['pending', 'accepted'])
    .maybeSingle()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <MentorDetail
          mentor={mentor as any}
          reviews={(reviews ?? []) as any}
          avgRating={avgRating}
          sessionCount={sessionCount ?? 0}
          existingSession={existingSession as any}
          userId={user.id}
        />
      </main>
    </div>
  )
}
