import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DirectoryClient from './directory-client'
import AppNav from '@/app/components/AppNav'
import FAQAccordion from '@/app/components/FAQAccordion'
import { MODULE_FAQS } from '@/lib/faq-data'

export default async function DirectoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any

  const [{ data: profiles }, { data: followingData }, { data: follows }, { data: mentors }, { data: followerData }, { data: menteeData }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, first_name, last_name, role, bio, location, institution, interests, is_verified, is_elite, is_admin, admin_role, avatar_url, subscription_tier, account_type, institution_type, institution_display_name, is_institution_verified, last_seen_at')
      .or('role.not.is.null,account_type.eq.institution')
      .order('created_at', { ascending: false }),
    supabaseAny
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id),
    supabaseAny
      .from('follows')
      .select('following_id'),
    supabaseAny
      .from('mentor_profiles')
      .select('user_id')
      .eq('is_active', true),
    supabaseAny
      .from('follows')
      .select('follower_id')
      .eq('following_id', user.id),
    supabaseAny
      .from('mentorship_sessions')
      .select('mentee_id'),
  ])

  const followingIds: string[] = (followingData ?? []).map(
    (f: { following_id: string }) => f.following_id
  )

  // Build follower count map
  const followerCountMap: Record<string, number> = {}
  for (const f of (follows ?? []) as { following_id: string }[]) {
    followerCountMap[f.following_id] = (followerCountMap[f.following_id] || 0) + 1
  }

  // Build mentor set
  const mentorIds: string[] = (mentors ?? []).map((m: { user_id: string }) => m.user_id)

  // Build follower IDs (people who follow the current user)
  const followerIds: string[] = (followerData ?? []).map(
    (f: { follower_id: string }) => f.follower_id
  )

  // Build mentee IDs (unique users who have requested/had mentorship sessions)
  const menteeIdsRaw: string[] = (menteeData ?? []).map((s: { mentee_id: string }) => s.mentee_id)
  const menteeIds: string[] = Array.from(new Set(menteeIdsRaw))

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Member Directory</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Connect with students, researchers, farmers and agripreneurs across Africa.
          </p>
        </div>

        {/* Public business index cross-link — routes users from the member */}
        {/* directory to the separate public /businesses listing.              */}
        <Link
          href="/businesses"
          className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-green-200 bg-green-50 px-5 py-4 transition-colors hover:border-green-300 hover:bg-green-100 dark:border-green-900/60 dark:bg-green-900/20 dark:hover:border-green-800 dark:hover:bg-green-900/30"
        >
          <div className="min-w-0">
            <p className="font-semibold text-green-900 dark:text-green-300">
              Looking for agribusinesses?
            </p>
            <p className="mt-0.5 text-sm text-green-800/80 dark:text-green-400/80">
              Browse the public Business Directory — farms, co-ops, and agri-companies.
            </p>
          </div>
          <span className="shrink-0 text-sm font-semibold text-green-700 dark:text-green-400">
            View businesses →
          </span>
        </Link>

        <DirectoryClient
          profiles={profiles ?? []}
          currentUserId={user.id}
          followingIds={followingIds}
          followerIds={followerIds}
          followerCountMap={followerCountMap}
          mentorIds={mentorIds}
          menteeIds={menteeIds}
        />
        <FAQAccordion items={MODULE_FAQS.directory} title="Frequently Asked Questions" subtitle="Common questions about the Directory" compact />
      </main>
    </div>
  )
}
