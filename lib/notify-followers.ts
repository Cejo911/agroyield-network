/**
 * Notify all followers of a user when they create meaningful content.
 *
 * "Meaningful actions" = posting opportunities, marketplace listings, research.
 * NOT: comments, likes, logins, profile edits.
 *
 * Uses service-role client to bypass RLS (followers table may be restricted).
 * Fire-and-forget — errors are logged but never block the caller.
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createNotificationBatch } from '@/lib/notifications'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

interface NotifyFollowersParams {
  actorId: string       // Who created the content
  actorName: string     // Display name for the notification
  contentType: 'opportunity' | 'listing' | 'research'
  contentTitle: string  // Title of the post
  contentId: string     // ID of the post (for link)
}

const CONTENT_META: Record<string, { label: string; path: string; type: string }> = {
  opportunity: { label: 'opportunity',         path: 'opportunities', type: 'new_opportunity' },
  listing:     { label: 'marketplace listing', path: 'marketplace',   type: 'new_listing' },
  research:    { label: 'research post',       path: 'research',      type: 'new_research' },
}

export async function notifyFollowers(params: NotifyFollowersParams) {
  try {
    const admin = getSupabaseAdmin() as SupabaseClient<Database>
    const meta = CONTENT_META[params.contentType]
    if (!meta) return

    // Get all users who follow this actor
    const { data: followers } = await admin
      .from('follows')
      .select('follower_id')
      .eq('following_id', params.actorId)

    if (!followers || followers.length === 0) return

    const followerIds = followers
      .map((f) => f.follower_id)
      .filter((id): id is string => id !== null)

    await createNotificationBatch(admin, followerIds, {
      type: meta.type,
      title: `${params.actorName} posted a new ${meta.label}`,
      body: params.contentTitle,
      link: `/${meta.path}/${params.contentId}`,
      actorId: params.actorId,
      entityId: params.contentId,
    })
  } catch (err) {
    // Never block the main request — follower notifications are best-effort
    console.error('[notify-followers] Error:', err)
  }
}
