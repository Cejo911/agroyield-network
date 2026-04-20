import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileForm from './profile-form'
import PageShell from '@/app/components/design/PageShell'
import PageHeader from '@/app/components/design/PageHeader'
import ShareProfileLink from './share-profile-link'
import ProfileViewStatsPanel from './profile-view-stats'
import ExperienceEditor from './experience-editor'
import { getProfileViewStats, getRecentViewers } from '@/lib/profile-views'
import { getProfileExperience } from '@/lib/profile-experience'
import { getEffectiveTier } from '@/lib/tiers'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any
  const [{ data: profile }, followersResult, followingResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabaseAny.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
    supabaseAny.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
  ])

  const followersCount: number = followersResult.count ?? 0
  const followingCount: number = followingResult.count ?? 0
  const rawProfile = profile as Record<string, unknown> | null
  const avatarUrl: string | null = (rawProfile && typeof rawProfile.avatar_url === 'string') ? rawProfile.avatar_url : null
  const username: string | null  = (rawProfile && typeof rawProfile.username === 'string')   ? rawProfile.username  : null
  const phone: string | null     = (rawProfile && typeof rawProfile.phone === 'string')      ? rawProfile.phone     : null
  const whatsapp: string | null  = (rawProfile && typeof rawProfile.whatsapp === 'string')   ? rawProfile.whatsapp  : null

  // Profile view stats + viewer list (the latter only for Pro tier). Running
  // the viewer fetch conditionally avoids leaking identities through RLS
  // error paths — free-tier users just never see the list.
  const tierHint = {
    subscription_tier:       (rawProfile?.subscription_tier as string | null | undefined) ?? null,
    subscription_expires_at: (rawProfile?.subscription_expires_at as string | null | undefined) ?? null,
  }
  const effectiveTier = getEffectiveTier(tierHint)
  const isPro = effectiveTier !== 'free'
  const [viewStats, viewers, experience] = await Promise.all([
    getProfileViewStats(supabaseAny, user.id),
    isPro ? getRecentViewers(supabaseAny, user.id, 10) : Promise.resolve(null),
    getProfileExperience(supabaseAny, user.id),
  ])

  return (
    <PageShell maxWidth="2xl">
      {/* Harmonization note: previously used py-12 / mb-6 — now inherits    */}
      {/* PageShell's py-10 and PageHeader's mb-8 for consistency with the   */}
      {/* rest of the app. Visual diff is minor (2 units of vertical rhythm). */}
      <PageHeader
        title="Your Profile"
        description="Help the community know who you are"
      />

      {/* Followers / Following stats */}
      <div className="flex items-center gap-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm px-6 py-4 mb-6">
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{followersCount}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Followers</p>
          </div>
          <div className="w-px h-8 bg-gray-100 dark:bg-gray-700" />
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{followingCount}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Following</p>
          </div>
          <div className="w-px h-8 bg-gray-100 dark:bg-gray-700" />
          <div className="ml-auto">
            <a href="/directory" className="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium transition-colors">Browse members &rarr;</a>
          </div>
        </div>

        <ProfileViewStatsPanel stats={viewStats} viewers={viewers} isPro={isPro} />

        <ExperienceEditor initialRows={experience} />

        {username && (
          <div className="mb-6">
            <ShareProfileLink username={username} />
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8">
          <ProfileForm
            userId={user.id}
            initialData={{
              first_name:    profile?.first_name    ?? null,
              last_name:     profile?.last_name     ?? null,
              role:          profile?.role          ?? null,
              bio:           profile?.bio           ?? null,
              location:      profile?.location      ?? null,
              institution:   profile?.institution   ?? null,
              institution_2: (rawProfile?.institution_2 as string) ?? null,
              institution_3: (rawProfile?.institution_3 as string) ?? null,
              interests:     profile?.interests     ?? null,
              linkedin:      profile?.linkedin      ?? null,
              twitter:       profile?.twitter       ?? null,
              facebook:      (rawProfile?.facebook as string) ?? null,
              tiktok:        (rawProfile?.tiktok as string) ?? null,
              website:       profile?.website       ?? null,
              avatar_url:    avatarUrl,
              phone:         phone,
              whatsapp:      whatsapp,
              gender:        (rawProfile?.gender as string) ?? null,
              date_of_birth: (rawProfile?.date_of_birth as string) ?? null,
              notify_on_login: (rawProfile?.notify_on_login as boolean | null) ?? true,
              account_type:             (rawProfile?.account_type as string) ?? 'individual',
              institution_type:         (rawProfile?.institution_type as string) ?? null,
              institution_display_name: (rawProfile?.institution_display_name as string) ?? null,
              contact_person_name:      (rawProfile?.contact_person_name as string) ?? null,
              contact_person_role:      (rawProfile?.contact_person_role as string) ?? null,
              institution_website:      (rawProfile?.institution_website as string) ?? null,
              institution_cac:          (rawProfile?.institution_cac as string) ?? null,
              is_institution_verified:  (rawProfile?.is_institution_verified as boolean) ?? false,
              open_to_opportunities:       (rawProfile?.open_to_opportunities as boolean) ?? false,
              open_to_opportunities_until: (rawProfile?.open_to_opportunities_until as string) ?? null,
            }}
          />
        </div>
    </PageShell>
  )
}
