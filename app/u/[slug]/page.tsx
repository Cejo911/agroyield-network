import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import AppNav from '@/app/components/AppNav'
import FollowButton from '@/app/directory/follow-button'
import VerifiedBadge from '@/app/components/VerifiedBadge'
import EliteBadge from '@/app/components/EliteBadge'

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('profiles')
    .select('first_name, last_name, role, institution, bio')
    .eq('username', slug)
    .single()
  if (!data) return { title: 'Member not found — AgroYield Network' }
  const raw = data as Record<string, unknown>
  const name = `${raw.first_name ?? ''} ${raw.last_name ?? ''}`.trim()
  const role = typeof raw.role === 'string' ? raw.role : null
  const institution = typeof raw.institution === 'string' ? raw.institution : null
  return {
    title: `${name} — AgroYield Network`,
    description: `${role ?? 'Member'}${institution ? ` at ${institution}` : ''} on AgroYield Network`,
    openGraph: {
      title: `${name} on AgroYield Network`,
      description: `${role ?? 'Member'}${institution ? ` at ${institution}` : ''} — Nigeria's agricultural professional network`,
      url: `https://agroyield.africa/u/${slug}`,
    },
  }
}

export default async function PublicProfilePage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any

  const { data: profile } = await supabaseAny
    .from('profiles')
    .select('*')
    .eq('username', slug)
    .single()

  if (!profile) notFound()

  const raw = profile as Record<string, unknown>

  const [followersResult, followingResult, { data: { user } }] = await Promise.all([
    supabaseAny.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', raw.id),
    supabaseAny.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', raw.id),
    supabase.auth.getUser(),
  ])

  const followersCount: number = followersResult.count ?? 0
  const followingCount: number = followingResult.count ?? 0

  let isFollowing = false
  if (user && user.id !== raw.id) {
    const { data: followData } = await supabaseAny
      .from('follows').select('id')
      .eq('follower_id', user.id)
      .eq('following_id', raw.id)
      .maybeSingle()
    isFollowing = !!followData
  }

  const avatarUrl   = typeof raw.avatar_url  === 'string' ? raw.avatar_url  : null
  const firstName   = typeof raw.first_name  === 'string' ? raw.first_name  : ''
  const lastName    = typeof raw.last_name   === 'string' ? raw.last_name   : ''
  const role        = typeof raw.role        === 'string' ? raw.role        : null
  const institution = typeof raw.institution === 'string' ? raw.institution : null
  const bio         = typeof raw.bio         === 'string' ? raw.bio         : null
  const location    = typeof raw.location    === 'string' ? raw.location    : null
  const linkedin    = typeof raw.linkedin    === 'string' ? raw.linkedin    : null
  const twitter     = typeof raw.twitter     === 'string' ? raw.twitter     : null
  const website     = typeof raw.website     === 'string' ? raw.website     : null
  const phone       = typeof raw.phone       === 'string' ? raw.phone       : null
  const whatsapp    = typeof raw.whatsapp    === 'string' ? raw.whatsapp    : null
  const profileId   = typeof raw.id          === 'string' ? raw.id          : ''
  const interests   = Array.isArray(raw.interests) ? raw.interests as string[] : []

  // Verification badges
  const isVerified =
    raw.is_verified === true &&
    (raw.subscription_expires_at == null ||
      new Date(raw.subscription_expires_at as string) > new Date())
  const isElite = raw.is_elite === true

  const initials = [firstName, lastName]
    .filter(Boolean).map(n => n.charAt(0).toUpperCase()).join('') || '?'

  const isOwnProfile = user?.id === profileId

  return (
    <div className="min-h-screen bg-gray-50">
      {user ? <AppNav /> : (
        <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 no-underline">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white text-sm">🌾</div>
            <span className="font-bold text-gray-900">Agro<span className="text-green-600">Yield</span></span>
          </a>
          <div className="flex items-center gap-3">
            <a href="/login" className="text-sm text-gray-600 hover:text-gray-900 font-medium">Log in</a>
            <a href="/signup" className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700">Sign up</a>
          </div>
        </nav>
      )}

      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-6">

            {/* Avatar */}
            <div className="shrink-0">
              {avatarUrl ? (
                <div
                  style={{ backgroundImage: `url(${avatarUrl})` }}
                  className="w-24 h-24 rounded-full bg-cover bg-center border-4 border-white shadow-md"
                  role="img"
                  aria-label={`${firstName} ${lastName}`}
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-green-600 flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-md">
                  {initials}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 flex-wrap">
                    {firstName} {lastName}
                    {isVerified && <VerifiedBadge size="md" />}
                    {isElite && <EliteBadge size="md" />}
                  </h1>
                  {role && <p className="text-sm text-green-600 font-semibold capitalize mt-0.5">{role}</p>}
                  {institution && <p className="text-sm text-gray-500 mt-0.5">🏛 {institution}</p>}
                  {location && <p className="text-sm text-gray-500 mt-0.5">📍 {location}</p>}
                </div>
                {!isOwnProfile && user && (
                  <FollowButton userId={profileId} initialIsFollowing={isFollowing} />
                )}
                {isOwnProfile && (
                  <a href="/profile"
                    className="text-sm text-gray-500 border border-gray-300 rounded-lg px-3 py-1.5 hover:border-green-400 transition-colors">
                    Edit profile
                  </a>
                )}
              </div>

              <div className="flex gap-6 mt-4">
                <div>
                  <span className="text-lg font-bold text-gray-900">{followersCount}</span>
                  <span className="text-sm text-gray-500 ml-1">followers</span>
                </div>
                <div>
                  <span className="text-lg font-bold text-gray-900">{followingCount}</span>
                  <span className="text-sm text-gray-500 ml-1">following</span>
                </div>
              </div>
            </div>
          </div>

          {bio && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-gray-700 leading-relaxed">{bio}</p>
            </div>
          )}

          {interests.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Interests</p>
              <div className="flex flex-wrap gap-2">
                {interests.map((interest: string) => (
                  <span key={interest} className="text-xs bg-green-50 text-green-700 border border-green-100 px-3 py-1 rounded-full">
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Contact — only visible to logged-in members */}
          {user && (phone || whatsapp) && (
            <div className="mt-5 pt-5 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Contact</p>
              <div className="flex flex-wrap gap-4">
                {phone && (
                  <a href={`tel:${phone}`} className="text-sm text-gray-700 hover:text-green-600 transition-colors">
                    📞 {phone}
                  </a>
                )}
                {whatsapp && (
                  <a href={'https://wa.me/' + whatsapp.replace(/[^0-9]/g, '')} target="_blank" rel="noopener noreferrer" className="text-sm text-green-600 hover:underline">
                    💬 WhatsApp
                  </a>
                )}
              </div>
            </div>
          )}

          {(linkedin || twitter || website) && (
            <div className="mt-5 pt-5 border-t border-gray-100 flex flex-wrap gap-4">
              {linkedin && (
                <a href={linkedin} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline">🔗 LinkedIn</a>
              )}
              {twitter && (
                <a href={twitter} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-blue-400 hover:underline">🐦 Twitter / X</a>
              )}
              {website && (
                <a href={website} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-green-600 hover:underline">🌐 Website</a>
              )}
            </div>
          )}
        </div>

        {/* Guest CTA */}
        {!user && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
            <p className="text-green-800 font-semibold mb-1">
              Connect with {firstName} on AgroYield Network
            </p>
            <p className="text-green-700 text-sm mb-4">
              Join Nigeria&apos;s agricultural professional network to follow and collaborate.
            </p>
            <div className="flex justify-center gap-3">
              <a href="/signup"
                className="bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors">
                Create free account
              </a>
              <a href="/login"
                className="border border-green-300 text-green-700 px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-100 transition-colors">
                Sign in
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
