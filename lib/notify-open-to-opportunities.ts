/**
 * Notify users who are "open to opportunities" when a new opportunity is posted.
 *
 * The feature #6 toggle (open_to_opportunities) is only useful if it pushes
 * relevant content to the user. This helper runs on opportunity-post success
 * and fan-outs a `matching_opportunity` notification to every user who:
 *   - has `open_to_opportunities = true`
 *   - has no expiry, OR the expiry is still in the future
 *   - is NOT the actor themselves (don't notify yourself about your own post)
 *   - is NOT already a follower of the actor (they get a separate `new_opportunity`
 *     notification via notify-followers; suppressing avoids duplicates)
 *
 * Fire-and-forget — errors are logged but never block the caller.
 *
 * Future: interest/keyword matching between opportunity.type/title and
 * user.interests. MVP here is "notify everyone who's open to work" —
 * simpler, still useful, and easy to tighten later.
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createNotificationBatch } from '@/lib/notifications'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

interface NotifyOpenToOppsParams {
  actorId:     string
  actorName:   string
  opportunityId:    string
  opportunityTitle: string
  opportunityType:  string | null
}

export async function notifyOpenToOpportunities(params: NotifyOpenToOppsParams) {
  try {
    const admin = getSupabaseAdmin() as SupabaseClient<Database>

    // Pull the candidate audience: everyone who's actively open. The RLS on
    // profiles allows the service-role client to read all rows, so no extra
    // auth plumbing is needed.
    const { data: candidates } = await admin
      .from('profiles')
      .select('id, open_to_opportunities, open_to_opportunities_until')
      .eq('open_to_opportunities', true)
      .neq('id', params.actorId)

    if (!candidates || candidates.length === 0) return

    const now = Date.now()
    const activeIds: string[] = candidates
      .filter((p) => {
        // Null expiry = indefinite
        if (!p.open_to_opportunities_until) return true
        return new Date(p.open_to_opportunities_until).getTime() >= now
      })
      .map((p) => p.id)

    if (activeIds.length === 0) return

    // Exclude followers (they already get `new_opportunity` from notify-followers).
    const { data: followerRows } = await admin
      .from('follows')
      .select('follower_id')
      .eq('following_id', params.actorId)

    const followerSet = new Set<string>(
      (followerRows ?? [])
        .map((r) => r.follower_id)
        .filter((id): id is string => id !== null)
    )

    const recipientIds = activeIds.filter(id => !followerSet.has(id))
    if (recipientIds.length === 0) return

    const typeLabel = params.opportunityType ? `${params.opportunityType} ` : ''

    await createNotificationBatch(admin, recipientIds, {
      type:     'matching_opportunity',
      title:    `New ${typeLabel}opportunity you might like`,
      body:     `${params.opportunityTitle} — posted by ${params.actorName}`,
      link:     `/opportunities/${params.opportunityId}`,
      actorId:  params.actorId,
      entityId: params.opportunityId,
    })
  } catch (err) {
    console.error('[notify-open-to-opportunities] Error:', err)
  }
}
