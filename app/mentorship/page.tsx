import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AppNav from '@/app/components/AppNav'
import MentorBrowser from './mentor-browser'
import { getSettings } from '@/lib/settings'
import { getEffectiveTier } from '@/lib/tiers'
import FAQAccordion from '@/app/components/FAQAccordion'
import { MODULE_FAQS } from '@/lib/faq-data'

export default async function MentorshipPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Check mentorship settings
  const settings = await getSettings(['mentorship_enabled', 'mentorship_requires_verification'])
  const mentorshipEnabled = settings.mentorship_enabled !== 'false'
  if (!mentorshipEnabled) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <AppNav />
        <main className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="text-5xl mb-4">🌱</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Mentorship Coming Soon</h1>
          <p className="text-gray-500 dark:text-gray-400">
            The mentorship module is currently being set up. Check back soon to connect with experienced agricultural professionals.
          </p>
          <Link href="/dashboard" className="inline-block mt-6 bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors">
            Back to Dashboard
          </Link>
        </main>
      </div>
    )
  }

  // Check if verification is required for mentorship
  if (settings.mentorship_requires_verification === 'true') {
    const { data: userProfile } = await (supabase as any)
      .from('profiles').select('subscription_tier, subscription_expires_at').eq('id', user.id).single()
    const effectiveTier = getEffectiveTier(userProfile ?? {})
    if (effectiveTier === 'free') {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
          <AppNav />
          <main className="max-w-2xl mx-auto px-4 py-20 text-center">
            <div className="text-5xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Subscribers Only</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Mentorship features are available to Pro and Growth subscribers. Upgrade your plan to unlock access to mentors and mentorship requests.
            </p>
            <Link href="/pricing" className="inline-block bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors">
              View Plans
            </Link>
          </main>
        </div>
      )
    }
  }

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
              My Requests
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
        <FAQAccordion items={MODULE_FAQS.mentorship} title="Frequently Asked Questions" subtitle="Common questions about Mentorship" compact />
      </main>
    </div>
  )
}
