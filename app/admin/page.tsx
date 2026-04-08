import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import AppNav from '@/app/components/AppNav'
import AdminClient from './admin-client'

type ReportGroup = {
  postId:    string
  postType:  'opportunity' | 'listing'
  postTitle: string
  isActive:  boolean
  count:     number
  reasons:   Record<string, number>
  latestAt:  string
}

export default async function AdminPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabaseAny
    .from('profiles').select('is_admin, admin_role').eq('id', user.id).single()
  const rawProfile = profile as Record<string, unknown> | null
  if (!rawProfile?.is_admin) redirect('/dashboard')

  const currentAdminRole = typeof rawProfile.admin_role === 'string'
    ? rawProfile.admin_role
    : 'moderator'

  // Use admin client for settings (bypasses RLS)
  const adminDb = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = adminDb as any

  const [
    { data: opportunities },
    { data: listings },
    { data: members },
    { data: settingsRows },
    { data: reports },
  ] = await Promise.all([
    supabaseAny.from('opportunities').select('*').order('created_at', { ascending: false }),
    supabaseAny.from('marketplace_listings').select('*').order('created_at', { ascending: false }),
    supabaseAny.from('profiles').select('*').order('created_at', { ascending: false }),
    adminAny.from('settings').select('key, value'),
    adminAny.from('reports').select('*').order('created_at', { ascending: false }),
  ])

  // Build profiles map
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

  // Build settings map
  const settingsMap: Record<string, string> = {}
  for (const s of (settingsRows ?? [])) {
    const raw = s as Record<string, unknown>
    if (typeof raw.key === 'string' && typeof raw.value === 'string') {
      settingsMap[raw.key] = raw.value
    }
  }

  // Build report groups
  const groupsMap: Record<string, ReportGroup> = {}
  for (const r of (reports ?? [])) {
    const raw = r as Record<string, unknown>
    const postId   = raw.post_id   as string
    const postType = raw.post_type as 'opportunity' | 'listing'
    const reason   = raw.reason    as string
    const key      = `${postType}:${postId}`

    if (!groupsMap[key]) {
      let postTitle = 'Untitled'
      let isActive  = true

      if (postType === 'opportunity') {
        const match = (opportunities ?? []).find(
          (o: unknown) => (o as Record<string, unknown>).id === postId
        ) as Record<string, unknown> | undefined
        if (match) {
          postTitle = typeof match.title === 'string' ? match.title : 'Untitled'
          isActive  = match.is_active as boolean
        }
      } else {
        const match = (listings ?? []).find(
          (l: unknown) => (l as Record<string, unknown>).id === postId
        ) as Record<string, unknown> | undefined
        if (match) {
          postTitle = typeof match.title === 'string' ? match.title : 'Untitled'
          isActive  = match.is_active as boolean
        }
      }

      groupsMap[key] = {
        postId, postType, postTitle, isActive,
        count: 0, reasons: {}, latestAt: raw.created_at as string,
      }
    }

    groupsMap[key].count++
    groupsMap[key].reasons[reason] = (groupsMap[key].reasons[reason] ?? 0) + 1
    if (raw.created_at && raw.created_at > groupsMap[key].latestAt) {
      groupsMap[key].latestAt = raw.created_at as string
    }
  }

  const reportGroups = Object.values(groupsMap).sort((a, b) => b.count - a.count)

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
          <p className="text-gray-500 mt-1">
            {currentAdminRole === 'super' ? 'Super Admin' : 'Moderator'} · Manage content and members on AgroYield Network
          </p>
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
          reportGroups={reportGroups}
          profilesMap={profilesMap}
          settingsMap={settingsMap}
          currentAdminRole={currentAdminRole}
          currentUserId={user.id}
        />
      </div>
    </div>
  )
}
