import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import AppNav from '@/app/components/AppNav'

export default async function FollowersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any

  // Get the profile owner's name
  const { data: profile } = await supabase.from('profiles').select('first_name, last_name').eq('id', id).single()
  if (!profile) notFound()

  // Get all follower IDs
  const { data: follows } = await supabaseAny
    .from('follows')
    .select('follower_id')
    .eq('following_id', id)

  const followerIds: string[] = (follows ?? []).map((f: any) => f.follower_id)

  // Fetch follower profiles
  const { data: followers } = followerIds.length > 0
    ? await supabase.from('profiles').select('id, first_name, last_name, role, institution, avatar_url, username').in('id', followerIds)
    : { data: [] }

  const ownerName = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'This user'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <Link href={`/directory/${id}`} className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 mb-4 transition-colors">
          ← Back to {ownerName}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          {user.id === id ? 'Your' : `${ownerName}'s`} Followers
          <span className="text-gray-400 font-normal text-lg ml-2">({followerIds.length})</span>
        </h1>

        {(followers ?? []).length === 0 ? (
          <p className="text-gray-400 text-sm">No followers yet.</p>
        ) : (
          <div className="space-y-3">
            {(followers ?? []).map((p: any) => {
              const name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Anonymous'
              const href = p.username ? `/u/${p.username}` : `/directory/${p.id}`
              return (
                <Link key={p.id} href={href}
                  className="flex items-center gap-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 hover:border-green-300 dark:hover:border-green-700 transition-colors">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt={name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 font-bold text-sm">
                      {name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {[p.role, p.institution].filter(Boolean).join(' · ') || 'Member'}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
