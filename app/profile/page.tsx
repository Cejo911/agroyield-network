import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileForm from './profile-form'
import AppNav from '@/app/components/AppNav'
import ShareProfileLink from './share-profile-link'

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

  const avatarUrl: string | null = (rawProfile && typeof rawProfile.avatar_url === 'string')
    ? rawProfile.avatar_url : null
  const username: string | null = (rawProfile && typeof rawProfile.username === 'string')
    ? rawProfile.username : null
  const phone: string | null = (rawProfile && typeof rawProfile.phone === 'string')
    ? rawProfile.phone : null
  const whatsapp: string | null = (rawProfile && typeof rawProfile.whatsapp === 'string')
    ? rawProfile.whatsapp : null

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />
      <div className="max-w-2xl mx-auto px-4 py-12">

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Your Profile</h1>
          <p className="text-gray-500 mt-1">Help the community know who you are</p>
        </div>

        <div className="flex items-center gap-6 bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4 mb-6">
          <div>
            <p className="text-2xl font-bold text-gray-900">{followersCount}</p>
            <p className="text-xs text-gray-500">Followers</p>
          </div>
          <div className="w-px h-8 bg-gray-100" />
          <div>
            <p className="text-2xl font-bold text-gray-900">{followingCount}</p>
            <p className="text-xs text-gray-500">Following</p>
          </div>
          <div className="w-px h-8 bg-gray-100" />
          <div className="ml-auto">
            <a href="/directory"
              className="text-sm text-green-600 hover:text-green-700 font-medium transition-colors">
              Browse members →
            </a>
          </div>
        </div>

        {username && (
          <div className="mb-6">
            <ShareProfileLink username={username} />
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <ProfileForm
            userId={user.id}
            initialData={{
              first_name:  profile?.first_name  ?? null,
              last_name:   profile?.last_name   ?? null,
              role:        profile?.role        ?? null,
              bio:         profile?.bio         ?? null,
              location:    profile?.location    ?? null,
              institution: profile?.institution ?? null,
              interests:   profile?.interests   ?? null,
              linkedin:    profile?.linkedin    ?? null,
              twitter:     profile?.twitter     ?? null,
              website:     profile?.website     ?? null,
              avatar_url:  avatarUrl,
              phone:       phone,
              whatsapp:    whatsapp,
            }}
          />
        </div>

      </div>
    </div>
  )
}
