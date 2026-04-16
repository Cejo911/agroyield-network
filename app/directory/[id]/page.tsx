import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import AppNav from '@/app/components/AppNav'
import FollowButton from '../follow-button'
import MessageButton from '@/app/components/MessageButton'
import BackButton from '@/app/components/BackButton'
import { safeHref } from '@/lib/safe-href'

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any

  const [{ data: profile }, { data: mentorProfile }, { count: followerCount }, { count: followingCount }, { data: followCheck }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', id).single(),
    supabaseAny.from('mentor_profiles').select('user_id, headline, is_active').eq('user_id', id).eq('is_active', true).maybeSingle(),
    supabaseAny.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', id),
    supabaseAny.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', id),
    supabaseAny.from('follows').select('id').eq('follower_id', user.id).eq('following_id', id).maybeSingle(),
  ])

  if (!profile) notFound()

  const isOwnProfile = user.id === id
  const isFollowing = !!followCheck

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <main className="max-w-2xl mx-auto px-4 py-10">
        {/* Back link */}
        <BackButton fallbackHref="/directory" label="Back" />

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-8">

          {/* Header */}
          <div className="flex items-start gap-5 mb-6">
            {profile.avatar_url ? (
              <Image src={profile.avatar_url} alt="" width={64} height={64} className="rounded-full object-cover border-2 border-white dark:border-gray-800 shadow-sm" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-green-700 dark:text-green-400 font-bold text-2xl">
                {profile.first_name?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {profile.first_name} {profile.last_name}
                </h1>
                {!isOwnProfile && (
                  <div className="flex items-center gap-2">
                    <MessageButton recipientId={id} />
                    <FollowButton userId={id} initialIsFollowing={isFollowing} />
                  </div>
                )}
              </div>
              {profile.role && (
                <span className="inline-block mt-1 text-sm bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-3 py-0.5 rounded-full font-medium capitalize">
                  {profile.role}
                </span>
              )}

              {/* Badges */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {mentorProfile && (
                  <Link href={`/mentorship/${id}`}
                    className="inline-flex items-center gap-1 text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors">
                    🎓 Mentor
                  </Link>
                )}
                {profile.subscription_tier === 'growth' && (
                  <span className="inline-flex items-center gap-1 text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium border border-amber-200 dark:border-amber-800">
                    ⭐ Growth
                  </span>
                )}
                {profile.subscription_tier === 'pro' && (
                  <span className="inline-flex items-center gap-1 text-xs bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full font-medium border border-green-200 dark:border-green-800">
                    ✓ Pro
                  </span>
                )}
                {profile.is_admin && profile.admin_role === 'super' && (
                  <span className="inline-flex items-center gap-1 text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-medium border border-red-200 dark:border-red-800">
                    ⚡ Admin
                  </span>
                )}
                {profile.is_admin && profile.admin_role === 'moderator' && (
                  <span className="inline-flex items-center gap-1 text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full font-medium border border-purple-200 dark:border-purple-800">
                    🛡 Moderator
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Follower / Following counts */}
          <div className="flex gap-3 mb-6">
            <Link href={`/directory/${id}/followers`} className="flex-1 text-center bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg py-3 hover:border-green-400 dark:hover:border-green-600 transition-colors">
              <p className="text-xl font-bold text-gray-900 dark:text-white">{followerCount ?? 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Followers</p>
            </Link>
            <Link href={`/directory/${id}/following`} className="flex-1 text-center bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg py-3 hover:border-green-400 dark:hover:border-green-600 transition-colors">
              <p className="text-xl font-bold text-gray-900 dark:text-white">{followingCount ?? 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Following</p>
            </Link>
          </div>

          {/* Details */}
          <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
            {profile.institution && (
              <p>
                <span className="mr-1">🏛</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">{profile.institution}</span>
              </p>
            )}
            {profile.institution_2 && (
              <p>
                <span className="mr-1">🏛</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">{profile.institution_2}</span>
              </p>
            )}
            {profile.institution_3 && (
              <p>
                <span className="mr-1">🏛</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">{profile.institution_3}</span>
              </p>
            )}
            {profile.location && (
              <p>
                <span className="mr-1">📍</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">{profile.location}</span>
              </p>
            )}
            {profile.bio && (
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1">About</p>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{profile.bio}</p>
              </div>
            )}
            {profile.interests && profile.interests.length > 0 && (
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Areas of Interest</p>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((interest: string) => (
                    <span
                      key={interest}
                      className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-3 py-1 rounded-full text-xs"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Social links — URLs validated via safeHref to block javascript: and other dangerous protocols */}
          {(safeHref(profile.linkedin) || safeHref(profile.twitter) || safeHref(profile.facebook) || safeHref(profile.tiktok) || safeHref(profile.website)) && (
            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-3">
              {safeHref(profile.linkedin) && (
                <Link href={safeHref(profile.linkedin)} target="_blank" rel="noopener noreferrer"
                  className="text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-4 py-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                  LinkedIn
                </Link>
              )}
              {safeHref(profile.twitter) && (
                <Link href={safeHref(profile.twitter)} target="_blank" rel="noopener noreferrer"
                  className="text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                  Twitter / X
                </Link>
              )}
              {safeHref(profile.facebook) && (
                <Link href={safeHref(profile.facebook)} target="_blank" rel="noopener noreferrer"
                  className="text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 px-4 py-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                  Facebook
                </Link>
              )}
              {safeHref(profile.tiktok) && (
                <Link href={safeHref(profile.tiktok)} target="_blank" rel="noopener noreferrer"
                  className="text-sm bg-gray-900 dark:bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors">
                  TikTok
                </Link>
              )}
              {safeHref(profile.website) && (
                <Link href={safeHref(profile.website)} target="_blank" rel="noopener noreferrer"
                  className="text-sm bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-4 py-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors">
                  Website
                </Link>
              )}
            </div>
          )}

          {/* Edit button */}
          {isOwnProfile && (
            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
              <Link
                href="/profile"
                className="inline-block bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
              >
                Edit your profile
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
