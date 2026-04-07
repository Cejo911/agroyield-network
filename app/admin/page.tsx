import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppNav from '@/app/components/AppNav'
import AdminClient from './admin-client'

export default async function AdminPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabaseAny
    .from('profiles').select('is_admin').eq('id', user.id).single()

  const rawProfile = profile as Record<string, unknown> | null
  if (!rawProfile?.is_admin) redirect('/dashboard')

  const [
    { data: opportunities },
    { data: listings },
    { data: members },
  ] = await Promise.all([
    supabaseAny.from('opportunities').select('*').order('created_at', { ascending: false }),
    supabaseAny.from('marketplace_listings').select('*').order('created_at', { ascending: false }),
    supabaseAny.from('profiles').select('*').order('created_at', { ascending: false }),
  ])

  // Build profiles map for poster name lookup
  const profilesMap: Record<string, { first_name: string | null; last_name: string | null }> = {}
  for (const m of (members ?? [])) {
    const raw = m as Record<string, unknown>
    if (typeof raw.id === 'string') {
      profilesMap[raw.id] = {
        first_name: typeof raw.first_name === 'string' ? raw.first_name : null,
        last_name:  typeof raw.last_name  === 'string' ? raw.last_name  : null,
      }
    }
  }

  const oppsCount     = (opportunities ?? []).length
  const listingsCount = (listings ?? []).length
  const membersCount  = (members ?? []).length
  const removedCount  = [
    ...(opportunities ?? []).filter((o: unknown) => !(o as Record<string, unknown>).is_active),
    ...(listings ?? []).filter((l: unknown) => !(l as Record<string, unknown>).is_active),
  ].length

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />
      <div className="max-w-4xl mx-auto px-4 py-10">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage content and members on AgroYield Network</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Opportunities', value: oppsCount },
            { label: 'Listings',      value: listingsCount },
            { label: 'Members',       value: membersCount },
            { label: 'Removed',       value: removedCount },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        <AdminClient
          opportunities={opportunities ?? []}
          listings={listings ?? []}
          members={members ?? []}
          profilesMap={profilesMap}
        />

      </div>
    </div>
  )
}
