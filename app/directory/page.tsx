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

  const [{ data: profiles }, { data: followingData }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, first_name, last_name, role, bio, location, institution, interests, is_verified, is_elite, is_admin, admin_role')
      .not('role', 'is', null)
      .order('created_at', { ascending: false }),
    supabaseAny
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id),
  ])

  const followingIds: string[] = (followingData ?? []).map(
    (f: { following_id: string }) => f.following_id
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />
      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Member Directory</h1>
          <p className="text-gray-500 mt-1">
            Connect with students, researchers, farmers and agripreneurs across Africa.
          </p>
        </div>
        <DirectoryClient
          profiles={profiles ?? []}
          currentUserId={user.id}
          followingIds={followingIds}
        />
      </main>
    </div>
  )
}
