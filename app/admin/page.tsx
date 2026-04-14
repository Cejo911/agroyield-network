export const dynamic = 'force-dynamic'

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
    .from('profiles').select('is_admin, admin_role, admin_permissions').eq('id', user.id).single()
  const rawProfile = profile as Record<string, unknown> | null
  if (!rawProfile?.is_admin) redirect('/dashboard')

  const currentAdminRole = typeof rawProfile.admin_role === 'string'
    ? rawProfile.admin_role
    : 'moderator'

  const currentAdminPermissions = (rawProfile.admin_permissions as Record<string, boolean>) ?? null

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
    { data: grants },
    { data: communityPosts },
    { data: researchPosts },
    { data: comments },
    { data: priceReports },
    { data: mentorProfiles },
    { data: mentorshipRequests },
    { data: settingsRows },
    { data: reports },
    { data: auditLog },
    { count: waitlistCount },
  ] = await Promise.all([
    supabaseAny.from('opportunities').select('*').order('created_at', { ascending: false }),
    supabaseAny.from('marketplace_listings').select('*').order('created_at', { ascending: false }),
    adminAny.from('profiles').select('id, first_name, last_name, email, username, is_admin, admin_role, admin_permissions, is_verified, is_elite, is_suspended, subscription_expires_at, subscription_plan, created_at').order('created_at', { ascending: false }),
    adminAny.from('grants').select('id, title, funder, category, status, featured, deadline, posted_by, created_at').order('created_at', { ascending: false }),
    adminAny.from('community_posts').select('id, user_id, post_type, content, image_url, is_active, is_pinned, created_at').order('created_at', { ascending: false }).limit(500),
    adminAny.from('research_posts').select('id, user_id, title, type, is_active, is_locked, created_at').order('created_at', { ascending: false }).limit(500),
    adminAny.from('comments').select('id, user_id, post_id, post_type, content, user_name, is_hidden, created_at').order('created_at', { ascending: false }).limit(500),
    adminAny.from('price_reports').select('id, user_id, commodity, state, market_name, price, unit, reported_at').order('reported_at', { ascending: false }).limit(500),
    adminAny.from('mentor_profiles').select('id, user_id, headline, expertise, availability, is_active, updated_at').order('updated_at', { ascending: false }),
    adminAny.from('mentorship_requests').select('id, mentor_id, mentee_id, topic, status, created_at').order('created_at', { ascending: false }).limit(200),
    adminAny.from('settings').select('key, value'),
    adminAny.from('reports').select('*').order('created_at', { ascending: false }),
    adminAny.from('admin_audit_log').select('id, admin_id, action, target_type, target_id, details, created_at').order('created_at', { ascending: false }).limit(100),
    adminAny.from('waitlist_signups').select('*', { count: 'exact', head: true }),
  ])

  const profilesMap: Record<string, { first_name: string | null; last_name: string | null; email: string | null; username: string | null }> = {}
  for (const m of (members ?? [])) {
    const raw = m as Record<string, unknown>
    const id = String(raw.id ?? '')
    if (id) {
      profilesMap[id] = {
        first_name: (raw.first_name as string) ?? null,
        last_name:  (raw.last_name as string)  ?? null,
        email:      (raw.email as string)      ?? null,
        username:   (raw.username as string)   ?? null,
      }
    }
  }

  const settingsMap: Record<string, string> = {}
  for (const s of (settingsRows ?? [])) {
    const raw = s as Record<string, unknown>
    if (typeof raw.key === 'string' && typeof raw.value === 'string') {
      settingsMap[raw.key] = raw.value
    }
  }

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

  const oppsCount        = (opportunities ?? []).length
  const listingsCount    = (listings ?? []).length
  const membersCount     = (members ?? []).length
  const grantsCount      = (grants ?? []).length
  const communityCount   = (communityPosts ?? []).length
  const removedCount     = [
    ...(opportunities ?? []).filter((o: unknown) => !(o as Record<string, unknown>).is_active),
    ...(listings ?? []).filter((l: unknown) => !(l as Record<string, unknown>).is_active),
  ].length

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Admin Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {currentAdminRole === 'super' ? 'Super Admin' : 'Moderator'} · Manage content and members on AgroYield Network
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
          {[
            { label: 'Waitlist',      value: waitlistCount ?? 0 },
            { label: 'Members',       value: membersCount },
            { label: 'Opportunities', value: oppsCount },
            { label: 'Grants',        value: grantsCount },
            { label: 'Listings',      value: listingsCount },
            { label: 'Community',     value: communityCount },
            { label: 'Removed',       value: removedCount },
          ].map(stat => (
            <div key={stat.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-3 text-center">
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        <AdminClient
          opportunities={opportunities ?? []}
          listings={listings ?? []}
          members={members ?? []}
          grants={grants ?? []}
          communityPosts={communityPosts ?? []}
          researchPosts={researchPosts ?? []}
          comments={comments ?? []}
          priceReports={priceReports ?? []}
          mentorProfiles={mentorProfiles ?? []}
          mentorshipRequests={mentorshipRequests ?? []}
          auditLog={auditLog ?? []}
          reportGroups={reportGroups}
          profilesMap={profilesMap}
          settingsMap={settingsMap}
          currentAdminRole={currentAdminRole}
          currentAdminPermissions={currentAdminPermissions}
          currentUserId={user.id}
        />
      </div>
    </div>
  )
}
