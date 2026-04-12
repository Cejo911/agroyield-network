import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import AppNav from '@/app/components/AppNav'
import MentorDetail from './mentor-detail'

export default async function MentorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch mentor profile with user info
  const { data: mentor } = await supabase
    .from('mentor_profiles')
    .select('*, profiles!mentor_profiles_user_id_fkey(first_name, last_name, role, institution, avatar_url, is_verified, bio)')
    .eq('user_id', id)
    .eq('is_active', true)
    .single()

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

  // Count completed sessions
  const { count: sessionCount } = await supabase
    .from('mentorship_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('mentor_id', id)
    .eq('status', 'completed')

  // Check if user already has a pending session with this mentor
  const { data: existingSession } = await supabase
    .from('mentorship_sessions')
    .select('id, status')
    .eq('mentor_id', id)
    .eq('mentee_id', user.id)
    .in('status', ['pending', 'confirmed'])
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
