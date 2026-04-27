// Profile-view recording helpers.
//
// A view is a (viewer, viewed, UTC-date) row — the unique index on the table
// guarantees one row per viewer per day, so refreshing the page does NOT inflate
// counts. The insert uses `upsert` with `ignoreDuplicates: true` so repeat visits
// same-day become cheap no-ops instead of index-conflict errors.
//
// Two callers today: /directory/[id]/page.tsx and /u/[slug]/page.tsx. Any future
// public profile surface (e.g. inline popovers) should call `recordProfileView`
// with identical arguments — centralising the contract here means we can change
// dedup semantics (e.g. move to per-week) in one place.
//
// Side effect: when a view is newly recorded (first time this viewer has
// viewed this profile today), we also fire a `profile_viewed` notification
// to the viewed user. Because the notification helper is fire-and-forget, a
// failure there never surfaces to the profile-render path.

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/notifications'
import type { SupabaseClient as SupabaseClientBase } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

type SupabaseClient = SupabaseClientBase<Database>

/**
 * Insert a profile-view row. Idempotent per (viewer, viewed, UTC-date) via the
 * unique index — duplicate same-day views are silently ignored.
 *
 * When a view is newly recorded, fires a `profile_viewed` notification to the
 * viewed user. This is a fire-and-forget side effect; the notification helper
 * swallows its own errors so a notification failure never breaks the profile
 * render.
 *
 * Returns `true` if the row was new (a genuine new view), `false` if the call
 * was a dedup no-op or failed.
 */
export async function recordProfileView(
  supabase: SupabaseClient,
  viewerId: string,
  viewedId: string
): Promise<boolean> {
  if (!viewerId || !viewedId || viewerId === viewedId) return false

  try {
    // Compute today's UTC view_date here so we can check existence before
    // inserting — and only fire the notification on a genuinely-new view.
    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD (UTC-ish)

    const { data: existing } = await supabase
      .from('profile_views')
      .select('id')
      .eq('viewer_id', viewerId)
      .eq('viewed_id', viewedId)
      .eq('view_date', today)
      .maybeSingle()

    if (existing) return false

    const { error } = await supabase
      .from('profile_views')
      .insert({ viewer_id: viewerId, viewed_id: viewedId })

    if (error) {
      // 23505 = unique-violation (concurrent race beat us to it). Safe to
      // treat as "not new" — the other request already fired its notification.
      if (error.code === '23505') return false
      console.error('[profile-views] insert failed', error)
      return false
    }

    // Fire a profile_viewed notification. Use the service-role admin client
    // because the viewer cannot write notifications for another user under RLS.
    // Fire-and-forget — any failure here is logged but never surfaces.
    try {
      const admin = getSupabaseAdmin() as SupabaseClient
      const { data: viewerProfile } = await admin
        .from('profiles')
        .select('first_name, last_name, username')
        .eq('id', viewerId)
        .single()

      const name = [viewerProfile?.first_name, viewerProfile?.last_name].filter(Boolean).join(' ') || 'Someone'
      const viewerLink = viewerProfile?.username ? `/u/${viewerProfile.username}` : `/directory/${viewerId}`

      await createNotification(admin, {
        userId:   viewedId,
        type:     'profile_viewed',
        title:    `${name} viewed your profile`,
        body:     'Tap to see who it was',
        link:     viewerLink,
        actorId:  viewerId,
      })
    } catch (err) {
      console.error('[profile-views] notification failed', err)
    }

    return true
  } catch (err) {
    console.error('[profile-views] unexpected error', err)
    return false
  }
}

export type ProfileViewStats = {
  total:   number
  last7:   number
  last30:  number
  uniqueViewers30: number
}

/**
 * Fetch aggregate view stats for a given profile. Pulls the last 30 days of
 * rows in a single query, then rolls them up in-process — at the volumes we
 * expect (N×100 views/user/month) this is cheaper than two range queries.
 */
export async function getProfileViewStats(
  supabase: SupabaseClient,
  viewedId: string
): Promise<ProfileViewStats> {
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - 30)

  const { data } = await supabase
    .from('profile_views')
    .select('viewer_id, created_at')
    .eq('viewed_id', viewedId)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })

  const rows: Array<{ viewer_id: string; created_at: string }> = data ?? []
  const now = Date.now()
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000

  let last7 = 0
  const uniqueViewers = new Set<string>()
  for (const r of rows) {
    if (now - new Date(r.created_at).getTime() <= sevenDaysMs) last7++
    uniqueViewers.add(r.viewer_id)
  }

  // Total across all time needs a separate count() — the 30-day cap above
  // intentionally bounds the row-scan cost of the stats query.
  const { count: totalCount } = await supabase
    .from('profile_views')
    .select('*', { count: 'exact', head: true })
    .eq('viewed_id', viewedId)

  return {
    total:   totalCount ?? 0,
    last7,
    last30:  rows.length,
    uniqueViewers30: uniqueViewers.size,
  }
}

export type ProfileViewer = {
  viewer_id: string
  created_at: string
  first_name: string | null
  last_name:  string | null
  avatar_url: string | null
  username:   string | null
  role:       string | null
  institution: string | null
}

/**
 * Fetch recent viewer identities. Only call this for Pro-tier users — free
 * tier sees the aggregate count only. Deduped to the most-recent view per
 * viewer so the list reads like a LinkedIn "Who viewed your profile" panel.
 */
export async function getRecentViewers(
  supabase: SupabaseClient,
  viewedId: string,
  limit: number = 20
): Promise<ProfileViewer[]> {
  const { data } = await supabase
    .from('profile_views')
    .select('viewer_id, created_at, profiles!profile_views_viewer_id_fkey(first_name, last_name, avatar_url, username, role, institution)')
    .eq('viewed_id', viewedId)
    .order('created_at', { ascending: false })
    .limit(limit * 3) // Over-fetch because we'll dedup by viewer_id

  const rows = (data ?? []) as Array<{
    viewer_id:  string
    created_at: string
    profiles:   { first_name: string | null; last_name: string | null; avatar_url: string | null; username: string | null; role: string | null; institution: string | null } | null
  }>

  const seen = new Set<string>()
  const out: ProfileViewer[] = []
  for (const r of rows) {
    if (seen.has(r.viewer_id)) continue
    seen.add(r.viewer_id)
    out.push({
      viewer_id:  r.viewer_id,
      created_at: r.created_at,
      first_name: r.profiles?.first_name  ?? null,
      last_name:  r.profiles?.last_name   ?? null,
      avatar_url: r.profiles?.avatar_url  ?? null,
      username:   r.profiles?.username    ?? null,
      role:       r.profiles?.role        ?? null,
      institution: r.profiles?.institution ?? null,
    })
    if (out.length >= limit) break
  }
  return out
}
