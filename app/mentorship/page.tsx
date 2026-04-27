import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import AppNav from '@/app/components/AppNav'
import MentorBrowser from './mentor-browser'
import { getSettings } from '@/lib/settings'
import { getEffectiveTier } from '@/lib/tiers'
import FAQAccordion from '@/app/components/FAQAccordion'
import PageShell from '@/app/components/design/PageShell'
import PageHeader from '@/app/components/design/PageHeader'
import { PrimaryLink, SecondaryLink } from '@/app/components/design/Button'
import { MODULE_FAQS } from '@/lib/faq-data'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

export default async function MentorshipPage() {
  const supabase = (await createClient()) as SupabaseClient<Database>
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
          <Image src="/logo-icon-colored.png" alt="AgroYield Network" width={56} height={56} className="mx-auto mb-4" />
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
    const { data: userProfile } = await supabase
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

  // Fetch active, admin-approved mentor profiles with user info.
  // approval_status is the authoritative gate — a mentor can toggle is_active
  // themselves (to pause accepting mentees), but can't self-approve. Both
  // flags must line up for a profile to appear in the public browser.
  const { data: mentors } = await supabase
    .from('mentor_profiles')
    .select('*, profiles!mentor_profiles_user_id_fkey(first_name, last_name, role, institution, avatar_url, is_verified, last_seen_at)')
    .eq('is_active', true)
    .eq('approval_status', 'approved')
    .order('created_at', { ascending: false })

  // Check if current user is already a mentor — and what state their
  // application is in. We use approval_status to tailor the CTA label and
  // surface a "Pending review" banner without needing a separate call.
  // Note: mentor_profiles has no `id` column — user_id IS the PK. Previous
  // selection of `id` was silently failing under the `any` cast. Bug fixed.
  const { data: ownProfile } = await supabase
    .from('mentor_profiles')
    .select('user_id, approval_status, rejection_reason')
    .eq('user_id', user.id)
    .maybeSingle()

  const ownStatus = ownProfile?.approval_status as 'pending' | 'approved' | 'rejected' | undefined
  const mentorCtaLabel =
    !ownProfile ? 'Become a Mentor'
    : ownStatus === 'pending'  ? 'Application Pending'
    : ownStatus === 'rejected' ? 'Update Application'
    : 'Edit Mentor Profile'

  // Get average ratings for all mentors
  const { data: ratings } = await supabase
    .from('mentorship_reviews')
    .select('reviewee_id, rating')

  // Compute averages
  const ratingMap: Record<string, { sum: number; count: number }> = {}
  for (const r of ratings ?? []) {
    if (!r.reviewee_id) continue
    const rating = r.rating ?? 0
    if (!ratingMap[r.reviewee_id]) ratingMap[r.reviewee_id] = { sum: 0, count: 0 }
    ratingMap[r.reviewee_id].sum += rating
    ratingMap[r.reviewee_id].count++
  }

  const mentorsWithRatings = (mentors ?? []).map((m) => ({
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
              {mentorCtaLabel}
            </PrimaryLink>
          </>
        }
      />
      {ownStatus === 'pending' && (
        <div className="mb-6 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
          <div className="text-xl">⏳</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Your mentor application is under review</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              We&apos;ll email you the moment it&apos;s approved — typically within 2 business days.
            </p>
          </div>
        </div>
      )}
      {ownStatus === 'rejected' && (
        <div className="mb-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
          <div className="text-xl">⚠️</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">Your mentor application needs an update</p>
            <p className="text-xs text-red-700 dark:text-red-400 mt-1">
              Check the reviewer note on your application page and resubmit — we&apos;ll re-review automatically.
            </p>
          </div>
        </div>
      )}
      <MentorBrowser mentors={mentorsWithRatings as unknown as Parameters<typeof MentorBrowser>[0]['mentors']} userId={user.id} />
      <FAQAccordion items={MODULE_FAQS.mentorship} title="Frequently Asked Questions" subtitle="Common questions about Mentorship" compact />
    </PageShell>
  )
}
