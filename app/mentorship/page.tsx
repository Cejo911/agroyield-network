import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppNav from '@/app/components/AppNav'
import MentorBrowser from './mentor-browser'
import { getSettings } from '@/lib/settings'
import { getEffectiveTier } from '@/lib/tiers'
import FAQAccordion from '@/app/components/FAQAccordion'
import PageShell from '@/app/components/design/PageShell'
import PageHeader from '@/app/components/design/PageHeader'
import { PrimaryLink, SecondaryLink } from '@/app/components/design/Button'
import { MODULE_FAQS } from '@/lib/faq-data'

export default async function MentorshipPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Check mentorship settings
  const settings = await getSettings(['mentorship_enabled', 'mentorship_requires_verification'])
  const mentorshipEnabled = settings.mentorship_enabled !== 'false'
  if (!mentorshipEnabled) {
    // Coming-soon empty state — centered hero layout doesn't use PageHeader
    // (no subtitle slot, actions stack below title). We wrap it in PageShell
    // so it picks up the canonical bg + AppNav while keeping the custom
    // vertical rhythm (py-20 + text-center).
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <AppNav />
        <main className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="text-5xl mb-4">🌱</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Mentorship Coming Soon</h1>
          <p className="text-gray-500 dark:text-gray-400">
            The mentorship module is currently being set up. Check back soon to connect with experienced agricultural professionals.
          </p>
          <div className="mt-6 inline-flex">
            <PrimaryLink href="/dashboard" size="lg">Back to Dashboard</PrimaryLink>
          </div>
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
            <div className="inline-flex">
              <PrimaryLink href="/pricing" size="lg">View Plans</PrimaryLink>
            </div>
          </main>
        </div>
      )
    }
  }

  // Fetch active mentor profiles with user info
  const { data: mentors } = await supabase
    .from('mentor_profiles')
    .select('*, profiles!mentor_profiles_user_id_fkey(first_name, last_name, role, institution, avatar_url, is_verified, last_seen_at)')
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
    <PageShell maxWidth="5xl">
      <PageHeader
        title="Mentorship"
        description="Connect with experienced agricultural professionals for guidance and growth."
        actions={
          <>
            <SecondaryLink href="/mentorship/sessions">My Requests</SecondaryLink>
            <PrimaryLink href="/mentorship/become-mentor">
              {ownProfile ? 'Edit Mentor Profile' : 'Become a Mentor'}
            </PrimaryLink>
          </>
        }
      />
      <MentorBrowser mentors={mentorsWithRatings} userId={user.id} />
      <FAQAccordion items={MODULE_FAQS.mentorship} title="Frequently Asked Questions" subtitle="Common questions about Mentorship" compact />
    </PageShell>
  )
}
