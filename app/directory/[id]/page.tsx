import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import AppNav from '@/app/components/AppNav'
import FollowButton from '../follow-button'

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (!profile) notFound()

  // Safe access for avatar_url (not yet in generated types)
  const rawProfile = profile as Record<string, unknown>
  const avatarUrl = typeof rawProfile.avatar_url === 'string' ? rawProfile.avatar_url : null

  // Follow counts + status (follows table not yet in generated types)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any

  const [followersResult, followingResult] = await Promise.all([
    supabaseAny.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', id),
    supabaseAny.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', id),
  ])
  const followersCount: number = followersResult.count ?? 0
  const followingCount: number = followingResult.count ?? 0

  let isFollowing = false
  if (user.id !== id) {
    const followCheck = await supabaseAny
      .from('follows').select('id')
      .eq('follower_id', user.id)
      .eq('following_id', id)
      .maybeSingle()
    isFollowing = !!followCheck.data
  }

  const initials =
    [profile.first_name, profile.last_name]
      .filter(Boolean)
      .map((n: string) => n[0].toUpperCase())
      .join('') || '?'

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />
      <main className="max-w-2xl mx-auto px-4 py-10">

        {/* Back */}
        <Link href="/directory"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-green-700 transition-colors mb-6">
          ← Back to Directory
        </Link>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">

          {/* Header row */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              {avatarUrl ? (
                <div
                  style={{ backgroundImage: `url(${avatarUrl})` }}
                  className="w-20 h-20 rounded-full bg-cover bg-center border-4 border-white shadow-md shrink-0"
                  role="img" aria-label="Profile photo"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-green-600 flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-md shrink-0">
                  {initials}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {profile.first_name} {profile.last_name}
                </h1>
                {profile.role && (
                  <span className="inline-block mt-1 text-sm bg-green-100 text-green-700 px-3 py-0.5 rounded-full font-medium capitalize">
                    {profile.role}
                  </span>
                )}
              </div>
            </div>

            {/* Follow button — hidden on own profile */}
            {user.id !== id && (
              <div className="shrink-0 mt-1">
                <FollowButton userId={id} initialIsFollowing={isFollowing} />
              </div>
            )}
          </div>

          {/* Follower / Following counts */}
          <div className="flex gap-8 mb-6 pb-6 border-b border-gray-100">
            <div>
              <p className="text-xl font-bold text-gray-900">{followersCount}</p>
              <p className="text-xs text-gray-500">Followers</p>
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{followingCount}</p>
              <p className="text-xs text-gray-500">Following</p>
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">About</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{profile.bio}</p>
            </div>
          )}

          {/* Details */}
          <div className="space-y-2 mb-6">
            {profile.institution && (
              <p className="text-sm text-gray-600">🏛 {profile.institution}</p>
            )}
            {profile.location && (
              <p className="text-sm text-gray-600">📍 {profile.location}</p>
            )}
          </div>

          {/* Interests */}
          {profile.interests && profile.interests.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Areas of Interest</h2>
              <div className="flex flex-wrap gap-2">
                {(profile.interests as string[]).map((interest: string) => (
                  <span key={interest}
                    className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-full">
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          {(profile.linkedin || profile.twitter || profile.website) && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Links</h2>
              <div className="flex flex-col gap-2">
                {profile.linkedin && (
                  <a href={profile.linkedin} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-green-600 hover:underline">
                    LinkedIn ↗
                  </a>
                )}
                {profile.twitter && (
                  <a href={profile.twitter} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-green-600 hover:underline">
                    Twitter / X ↗
                  </a>
                )}
                {profile.website && (
                  <a href={profile.website} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-green-600 hover:underline">
                    Website ↗
                  </a>
                )}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
