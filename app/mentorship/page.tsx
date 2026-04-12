import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AppNav from '@/app/components/AppNav'
import MentorBrowser from './mentor-browser'

export default async function MentorshipPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch active mentor profiles with user info
  const { data: mentors } = await supabase
    .from('mentor_profiles')
    .select('*, profiles!mentor_profiles_user_id_fkey(first_name, last_name, role, institution, avatar_url, is_verified)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  // Check if current user is already a mentor
  const { data: ownProfile } = await supabase
    .from('mentor_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  // Get average ratings for all mentors
  const { data: ratings } = await supabase
    .from('mentorship_reviews')
    .select('reviewee_id, rating')

  // Compute averages
  const ratingMap: Record<string, { sum: number; count: number }> = {}
  for (const r of ratings ?? []) {
    if (!ratingMap[r.reviewee_id]) ratingMap[r.reviewee_id] = { sum: 0, count: 0 }
    ratingMap[r.reviewee_id].sum += r.rating
    ratingMap[r.reviewee_id].count++
  }

  const mentorsWithRatings = (mentors ?? []).map((m: any) => ({
    ...m,
    avgRating: ratingMap[m.user_id] ? Math.round((ratingMap[m.user_id].sum / ratingMap[m.user_id].count) * 10) / 10 : null,
    reviewCount: ratingMap[m.user_id]?.count ?? 0,
  }))

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mentorship</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Connect with experienced agricultural professionals for guidance and growth.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/mentorship/sessions"
              className="border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              My Sessions
            </Link>
            <Link
              href="/mentorship/become-mentor"
              className="bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
            >
              {ownProfile ? 'Edit Mentor Profile' : 'Become a Mentor'}
            </Link>
          </div>
        </div>
        <MentorBrowser mentors={mentorsWithRatings} userId={user.id} />
      </main>
    </div>
  )
}
