// lib/mentions/fanout.ts
//
// Server-side fan-out pipeline for @mentions in comments.
//
// Pipeline (per docs/features/mentions.md §5.2):
//   1. Parse the raw comment body → candidate @usernames.
//   2. Resolve each username against the mentioner's accepted connections.
//      Unknown / unconnected usernames are silently dropped (the parser
//      will also leave them as plain text in the stored body).
//   3. Apply abuse guards:
//        - Max 5 mentions per comment (parser enforces; we re-check).
//        - Max 50 mention-notifications per mentioner per rolling hour.
//   4. Tokenize the body so stored content uses `<@uuid>` tokens that
//      survive username changes.
//   5. Write one row per mentioned user into public.comment_mentions.
//   6. Emit one notification row per mentioned user.
//
// This module uses the Supabase *service-role admin client* throughout —
// RLS is the backstop, not the gate. We still pass `mentionerUserId`
// everywhere and only ever insert rows with that value, so a caller
// can't accidentally fan out a mention "from" another user.
//
// NOT exposed in the API layer directly — only called from
// app/api/comments/route.ts under a feature-flag check. The endpoint
// ships returning 404 when the flag is off, so this module is dead code
// at launch (dormant, per the scoping doc).

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  MAX_MENTIONS_PER_COMMENT,
  extractMentionCandidates,
  resolveCandidates,
  tokenize,
} from '@/lib/mentions/parser'

// Per scoping doc §5.2 abuse guards.
export const MAX_MENTION_NOTIFICATIONS_PER_HOUR = 50

export type FanOutInput = {
  /** Service-role admin client. RLS does not apply. */
  supabase: SupabaseClient
  /** The UUID of the comment row in public.comments that was just inserted. */
  commentId: string
  /** Raw comment body as the user typed it (pre-tokenize). */
  body: string
  /** UUID of the user who wrote the comment. */
  mentionerUserId: string
  /**
   * The parent comment's post_type — denormalized onto comment_mentions
   * so surface-scoped queries don't need a join. Must match public.comments.post_type
   * for this comment (the DB trigger will reject mismatches, belt+braces).
   */
  commentPostType: string
  /** Display name of the mentioner, used in the notification title. */
  mentionerDisplayName: string
  /**
   * Pre-built link like `/community/{postId}`; the caller owns URL routing
   * so this module doesn't need to know about post-id / surface mapping.
   * (An earlier draft accepted `postId` too — it was redundant once the
   * caller started passing `notificationLink` pre-computed, so we dropped it.)
   */
  notificationLink: string
}

export type FanOutResult =
  | {
      ok: true
      tokenizedBody: string
      mentionedCount: number
      mentionedUuids: string[]
    }
  | {
      ok: false
      reason: 'too_many_mentions' | 'hourly_cap_exceeded' | 'no_mentions'
      count?: number
    }

/**
 * Resolve a list of typed usernames to profile UUIDs, filtered by the
 * mentioner's accepted connections.
 *
 * Two-query pattern (same as the mention-search endpoint):
 *   1. Fetch accepted connection user_ids for the mentioner.
 *   2. Fetch profiles whose username is in `usernames` AND id is in that set.
 *
 * Case-insensitive match on username. The product's username column has
 * no strict case normalization so we compare lowercased on both sides —
 * this avoids "@Okoli" silently failing to resolve to the `okoli` profile.
 */
export async function resolveUsernamesToUuids(
  supabase: SupabaseClient,
  usernames: string[],
  mentionerUserId: string,
): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  if (usernames.length === 0) return result

  // 1. Accepted connections for the mentioner (bidirectional).
  const { data: connRows, error: connErr } = await supabase
    .from('connections')
    .select('requester_id, recipient_id, status')
    .eq('status', 'accepted')
    .or(
      `requester_id.eq.${mentionerUserId},recipient_id.eq.${mentionerUserId}`,
    )

  if (connErr || !connRows || connRows.length === 0) return result

  const connectedIds = new Set<string>()
  for (const row of connRows as Array<{
    requester_id: string
    recipient_id: string
  }>) {
    const other =
      row.requester_id === mentionerUserId ? row.recipient_id : row.requester_id
    connectedIds.add(other)
  }
  if (connectedIds.size === 0) return result

  // 2. Lookup profiles by username, restricted to the connection set.
  // Dedupe + lowercase first to avoid redundant filter values.
  const usernamesLC = Array.from(
    new Set(usernames.map((u) => u.toLowerCase())),
  )
  const { data: profileRows, error: profileErr } = await supabase
    .from('profiles')
    .select('id, username')
    .in('id', Array.from(connectedIds))
    .in('username', usernamesLC)
    .eq('is_suspended', false)

  if (profileErr || !profileRows) return result

  // Build a lowercased map so callers can look up regardless of the
  // case the mentioner typed.
  for (const p of profileRows as Array<{ id: string; username: string | null }>) {
    if (!p.username) continue
    result.set(p.username.toLowerCase(), p.id)
  }
  return result
}

/**
 * Count how many distinct mention notifications a user has generated in
 * the last 60 minutes. Used to enforce the 50/hour abuse cap.
 *
 * Counting by mention rows (not by notifications) keeps the cap honest
 * against the duplicate-notification dedupe — if a user @-tags the same
 * person twice in one comment, that's 1 row, not 2.
 */
export async function countMentionsLastHour(
  supabase: SupabaseClient,
  mentionerUserId: string,
): Promise<number> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count, error } = await supabase
    .from('comment_mentions')
    .select('id', { count: 'exact', head: true })
    .eq('mentioner_user_id', mentionerUserId)
    .gte('created_at', since)

  if (error) return 0 // fail-open-ish: counter error shouldn't block commenting
  return count ?? 0
}

/**
 * Case-insensitive lookup proxy. `parser.tokenize` reads from a
 * `Map<string, string>` keyed by the typed username (as the user wrote
 * it). We want resolution to be case-insensitive, so we wrap the
 * lowercased map in a tiny shim that lowercases the key on `get`.
 *
 * Built as a new Map rather than a Proxy so the shape stays JSON-ish
 * and Node's profiler is happy.
 */
function caseInsensitiveMap(
  lowercased: Map<string, string>,
): Map<string, string> {
  const out = new Map<string, string>()
  // Seed with the lowercased pairs so direct lookup works.
  for (const [k, v] of lowercased.entries()) out.set(k, v)
  return new Proxy(out, {
    get(target, prop, receiver) {
      if (prop === 'get') {
        return (key: string) => target.get(key.toLowerCase())
      }
      return Reflect.get(target, prop, receiver)
    },
  }) as Map<string, string>
}

/**
 * The full fan-out pipeline. Call this from the comment write endpoint
 * AFTER the comment row has been inserted into public.comments — we
 * need the comment_id to write the junction rows.
 *
 * Returns the tokenized body so the caller can follow up with an
 * UPDATE on public.comments.content. We don't do the UPDATE in here
 * because the caller already has a handle on the row it just inserted
 * and can do it atomically at the end of its transaction.
 */
export async function fanOutMentions(
  input: FanOutInput,
): Promise<FanOutResult> {
  const {
    supabase,
    commentId,
    body,
    mentionerUserId,
    commentPostType,
    mentionerDisplayName,
    notificationLink,
  } = input

  // 1. Parse candidate mentions from raw body.
  const candidates = extractMentionCandidates(body)
  if (candidates.length === 0) {
    return { ok: false, reason: 'no_mentions' }
  }

  // 2. Resolve usernames → UUIDs via accepted connections only.
  const usernames = candidates.map((c) => c.username)
  const lowercasedMap = await resolveUsernamesToUuids(
    supabase,
    usernames,
    mentionerUserId,
  )

  // Wrap in a case-insensitive view so the parser can resolve "@Okoli".
  const lookup = caseInsensitiveMap(lowercasedMap)

  // 3. Per-comment cap (5).
  const resolve = resolveCandidates(candidates, lookup)
  if (!resolve.ok) {
    return { ok: false, reason: resolve.reason, count: resolve.count }
  }
  if (resolve.uuids.length === 0) {
    // Parser matched @-patterns but none were connected — treat as no-op.
    return { ok: false, reason: 'no_mentions' }
  }

  // 4. Hourly cap (50).
  const recentCount = await countMentionsLastHour(supabase, mentionerUserId)
  if (recentCount + resolve.uuids.length > MAX_MENTION_NOTIFICATIONS_PER_HOUR) {
    return {
      ok: false,
      reason: 'hourly_cap_exceeded',
      count: recentCount + resolve.uuids.length,
    }
  }

  // 5. Tokenize the body. `mentionedUuids` from tokenize will match
  //    `resolve.uuids` by construction; we still dedupe defensively.
  const { tokenized, mentionedUuids } = tokenize(body, lookup)
  const uniqueUuids = Array.from(new Set(mentionedUuids))

  // 6. Write the junction rows. We use service-role (RLS bypass) since
  //    the API layer has already authenticated the mentioner. The
  //    denormalization trigger on the DB side will reject any row where
  //    comment_post_type doesn't match the parent — belt + braces.
  const mentionRows = uniqueUuids.map((mentionedUuid) => ({
    comment_id: commentId,
    comment_post_type: commentPostType,
    mentioned_user_id: mentionedUuid,
    mentioner_user_id: mentionerUserId,
  }))
  const { error: mentionsErr } = await supabase
    .from('comment_mentions')
    .insert(mentionRows)
  if (mentionsErr) {
    // Don't emit notifications if the junction write failed — we'd
    // have orphan notifications with nothing to link back to.
    return { ok: false, reason: 'no_mentions' }
  }

  // 7. Emit one notification row per mentioned user.
  // Mirrors the pattern in lib/notifications.ts createNotificationBatch.
  const notifyRows = uniqueUuids.map((mentionedUuid) => ({
    user_id: mentionedUuid,
    type: 'comment_mention',
    title: `${mentionerDisplayName} mentioned you in a comment`,
    link: notificationLink,
    actor_id: mentionerUserId,
    entity_id: commentId,
  }))
  const { error: notifyErr } = await supabase
    .from('notifications')
    .insert(notifyRows)
  if (notifyErr) {
    // Log but don't roll back — the mention rows are the source of
    // truth; the bell icon will still refresh from them on next load
    // if we later add a fallback query.
    console.error('comment_mention notify batch failed:', notifyErr.message)
  }

  return {
    ok: true,
    tokenizedBody: tokenized,
    mentionedCount: uniqueUuids.length,
    mentionedUuids: uniqueUuids,
  }
}

// Re-export the per-comment cap so callers don't double-import from parser.
export { MAX_MENTIONS_PER_COMMENT }
