import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DirectoryClient from './directory-client'
import AppNav from '@/app/components/AppNav'

export default async function DirectoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any

  const [{ data: profiles }, { data: followingData }, { data: follows }, { data: mentors }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, first_name, last_name, role, bio, location, institution, interests, is_verified, is_elite, is_admin, admin_role, avatar_url')
      .not('role', 'is', null)
      .order('is_elite', { ascending: false })
      .order('is_verified', { ascending: false })
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
        <DirectoryClient
          profiles={profiles ?? []}
          currentUserId={user.id}
          followingIds={followingIds}
          followerCountMap={followerCountMap}
          mentorIds={mentorIds}
        />
      </main>
    </div>
  )
}
