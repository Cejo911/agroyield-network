// app/api/comments/route.ts
//
// Server-side comment write endpoint with @mentions fan-out.
//
// Context (important — read before touching this file)
// ----------------------------------------------------
// As of 27 Apr launch, the community feed inserts comments *directly*
// from the browser via `supabase.from('comments').insert(...)` — see
// app/components/CommentsSection.tsx lines 143-154. There is no
// pre-existing server-side comment route.
//
// This endpoint is NEW and exists solely to carry the @mentions fan-out
// logic without disturbing the launch-day direct-insert path. It is
// dormant at launch — the feature flag is OFF, so POST/PATCH return 404
// and nothing calls in.
//
// Post-launch flip (task #43):
//   Step 1: flip `comment_mentions_enabled` in feature_flags.
//   Step 2: refactor CommentsSection.tsx to route through this endpoint
//           instead of the direct insert. The client behaviour-switch
//           reads the same flag.
//
// Until both steps happen, this file is safe to merge.
//
// Response contract
// -----------------
// POST /api/comments
//   Body: { post_id, post_type, content, parent_id?, user_name? }
//   200:  { comment: { ... }, mentionedCount, mentionedUuids }
//   400:  { error: 'too_many_mentions' } or validation errors
//   401:  not authed
//   404:  feature flag off
//   429:  rate limited
//
// PATCH /api/comments
//   Body: { id, content }
//   200:  { comment: { ... }, mentionedCount, mentionedUuids }
//   401/403/404/429 as above.
//
// Mentions semantics for PATCH
// ----------------------------
// Editing a comment re-parses mentions: existing mention rows for this
// comment are DELETED and the new set is inserted. Per scoping doc §3,
// notifications are NOT re-fired on edit — users aren't re-pinged when
// someone fixes a typo or adds a mention after the fact.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import {
  extractMentionCandidates,
  resolveCandidates,
  tokenize,
} from '@/lib/mentions/parser'
import {
  fanOutMentions,
  resolveUsernamesToUuids,
  countMentionsLastHour,
  MAX_MENTION_NOTIFICATIONS_PER_HOUR,
} from '@/lib/mentions/fanout'

// Rate limit: typeahead is per-IP 30/min (high frequency); comment
// submission is bursty but much lower — 15/min matches the UX (sub-400
// comments per user per session at absolute max).
const RATE_LIMIT_WRITE = 15
const RATE_WINDOW_MS = 60_000

const MAX_CONTENT_LEN = 5000
const VALID_POST_TYPES = new Set([
  'research',
  'opportunity',
  'listing',
  'price_report',
  'community',
])

// Return 404 rather than 403/empty so the endpoint is opaque when off.
// Same pattern as the mention-search endpoint.
function notFound() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

function getIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  )
}

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

function linkForPostType(postType: string, postId: string): string {
  switch (postType) {
    case 'research':
      return `/research/${postId}`
    case 'opportunity':
      return `/opportunities/${postId}`
    case 'listing':
      return `/marketplace/${postId}`
    case 'price_report':
      return `/prices`
    case 'community':
    default:
      return `/community/${postId}`
  }
}

async function getMentionerDisplayName(
  supabase: ReturnType<typeof getAdminClient>,
  userId: string,
): Promise<string> {
  const { data } = await supabase
    .from('profiles')
    .select('first_name, last_name, username')
    .eq('id', userId)
    .single()
  if (!data) return 'Someone'
  const fullName = [data.first_name, data.last_name]
    .filter(Boolean)
    .join(' ')
    .trim()
  return fullName || data.username || 'Someone'
}

// ---------------------------------------------------------------------------
// POST — create a comment + fan out mentions
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  // 1. Feature flag gate.
  if (!(await isFeatureEnabled('comment_mentions_enabled'))) {
    return notFound()
  }

  // 2. Rate limit.
  const { success } = rateLimit(getIp(request), {
    limit: RATE_LIMIT_WRITE,
    windowMs: RATE_WINDOW_MS,
  })
  if (!success) return rateLimitResponse()

  // 3. Auth.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 4. Body validation.
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const postId = typeof body.post_id === 'string' ? body.post_id : ''
  const postType = typeof body.post_type === 'string' ? body.post_type : ''
  const content =
    typeof body.content === 'string' ? body.content.trim() : ''
  const parentId =
    typeof body.parent_id === 'string' ? body.parent_id : null
  const userName =
    typeof body.user_name === 'string' ? body.user_name : null

  if (!postId || !VALID_POST_TYPES.has(postType)) {
    return NextResponse.json(
      { error: 'post_id and valid post_type required' },
      { status: 400 },
    )
  }
  if (content.length === 0 || content.length > MAX_CONTENT_LEN) {
    return NextResponse.json(
      { error: `content must be 1..${MAX_CONTENT_LEN} chars` },
      { status: 400 },
    )
  }

  // 5. Insert the comment (admin client so we can roll forward into the
  //    fan-out without a second round-trip for auth).
  const admin = getAdminClient()
  const { data: inserted, error: insertErr } = await admin
    .from('comments')
    .insert({
      user_id: user.id,
      post_id: postId,
      post_type: postType,
      content,
      user_name: userName,
      parent_id: parentId,
    })
    .select('id, user_id, content, user_name, parent_id, created_at, post_type, post_id')
    .single()

  if (insertErr || !inserted) {
    return NextResponse.json(
      { error: 'Failed to insert comment' },
      { status: 500 },
    )
  }

  // 6. Fan out mentions. If there are no @-mentions in the body this
  //    is a cheap no-op and we just return the inserted comment.
  const mentionerDisplayName = await getMentionerDisplayName(admin, user.id)
  const fanOut = await fanOutMentions({
    supabase: admin,
    commentId: inserted.id,
    body: content,
    mentionerUserId: user.id,
    commentPostType: postType,
    mentionerDisplayName,
    notificationLink: linkForPostType(postType, postId),
  })

  // 7. Handle cap violations by rolling back the comment. A rejected
  //    "too_many_mentions" should not land as a stored comment with
  //    broken text. An hourly-cap exceedance is treated the same way —
  //    better to tell the user to cool off than to accept the comment
  //    with mentions silently dropped.
  if (!fanOut.ok && fanOut.reason === 'too_many_mentions') {
    await admin.from('comments').delete().eq('id', inserted.id)
    return NextResponse.json(
      { error: 'too_many_mentions', count: fanOut.count },
      { status: 400 },
    )
  }
  if (!fanOut.ok && fanOut.reason === 'hourly_cap_exceeded') {
    await admin.from('comments').delete().eq('id', inserted.id)
    return NextResponse.json(
      { error: 'hourly_cap_exceeded', count: fanOut.count },
      { status: 429 },
    )
  }

  // 8. If fan-out succeeded, tokenize the stored body. Otherwise the
  //    body stays as typed (no @-resolutions, no-op on
  //    fanOut.reason='no_mentions').
  if (fanOut.ok && fanOut.tokenizedBody !== content) {
    const { error: updErr } = await admin
      .from('comments')
      .update({ content: fanOut.tokenizedBody })
      .eq('id', inserted.id)
    if (updErr) {
      // Mentions are already stored; the next edit will re-sync. Don't
      // hard-fail the user's submit because of a content-update retry.
      console.error('comments.content tokenize update failed:', updErr.message)
    } else {
      inserted.content = fanOut.tokenizedBody
    }
  }

  return NextResponse.json({
    comment: inserted,
    mentionedCount: fanOut.ok ? fanOut.mentionedCount : 0,
    mentionedUuids: fanOut.ok ? fanOut.mentionedUuids : [],
  })
}

// ---------------------------------------------------------------------------
// PATCH — edit a comment; re-parse mentions (no re-notify per §3)
// ---------------------------------------------------------------------------
export async function PATCH(request: NextRequest) {
  if (!(await isFeatureEnabled('comment_mentions_enabled'))) {
    return notFound()
  }

  const { success } = rateLimit(getIp(request), {
    limit: RATE_LIMIT_WRITE,
    windowMs: RATE_WINDOW_MS,
  })
  if (!success) return rateLimitResponse()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const commentId = typeof body.id === 'string' ? body.id : ''
  const content =
    typeof body.content === 'string' ? body.content.trim() : ''
  if (!commentId) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }
  if (content.length === 0 || content.length > MAX_CONTENT_LEN) {
    return NextResponse.json(
      { error: `content must be 1..${MAX_CONTENT_LEN} chars` },
      { status: 400 },
    )
  }

  const admin = getAdminClient()

  // Verify ownership and fetch post_type/post_id for the re-parse.
  const { data: existing, error: fetchErr } = await admin
    .from('comments')
    .select('id, user_id, post_id, post_type')
    .eq('id', commentId)
    .single()
  if (fetchErr || !existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (existing.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Delete old mention rows — will be re-written below.
  await admin.from('comment_mentions').delete().eq('comment_id', commentId)

  // Re-run fan-out on the new body. Note: per scoping doc §3, edits do
  // NOT re-fire notifications. fanOutMentions does emit notification
  // rows though, so we need to suppress that for PATCH. The cleanest
  // way is to only re-insert mention rows manually here, skipping the
  // notifications step.
  //
  // For simplicity we inline the logic rather than add an API flag to
  // fanOutMentions that silently skips notifications — explicit > clever.
  const candidates = extractMentionCandidates(content)
  let tokenizedBody = content
  const mentionedUuids: string[] = []

  if (candidates.length > 0) {
    const lowercasedMap = await resolveUsernamesToUuids(
      admin,
      candidates.map((c) => c.username),
      user.id,
    )
    const lookup = new Map<string, string>()
    for (const [k, v] of lowercasedMap.entries()) lookup.set(k, v)
    // Case-insensitive get via a wrapper.
    const insensitive = new Proxy(lookup, {
      get(target, prop, receiver) {
        if (prop === 'get')
          return (key: string) => target.get(key.toLowerCase())
        return Reflect.get(target, prop, receiver)
      },
    }) as Map<string, string>

    const resolve = resolveCandidates(candidates, insensitive)
    if (!resolve.ok) {
      return NextResponse.json(
        { error: 'too_many_mentions', count: resolve.count },
        { status: 400 },
      )
    }

    // Hourly cap still applies on edit — a spammer shouldn't be able to
    // skirt the 50/hour cap by editing old comments.
    const recent = await countMentionsLastHour(admin, user.id)
    if (recent + resolve.uuids.length > MAX_MENTION_NOTIFICATIONS_PER_HOUR) {
      return NextResponse.json(
        { error: 'hourly_cap_exceeded', count: recent + resolve.uuids.length },
        { status: 429 },
      )
    }

    const { tokenized, mentionedUuids: uuids } = tokenize(content, insensitive)
    tokenizedBody = tokenized
    const unique = Array.from(new Set(uuids))
    mentionedUuids.push(...unique)

    if (unique.length > 0) {
      const rows = unique.map((mentionedUuid) => ({
        comment_id: commentId,
        comment_post_type: existing.post_type,
        mentioned_user_id: mentionedUuid,
        mentioner_user_id: user.id,
      }))
      const { error: insErr } = await admin
        .from('comment_mentions')
        .insert(rows)
      if (insErr) {
        console.error(
          'PATCH re-insert of comment_mentions failed:',
          insErr.message,
        )
      }
      // NO notifications on edit — per scoping doc §3.
    }
  }

  // Update the stored body (tokenized if mentions resolved, plain otherwise).
  const { data: updated, error: updErr } = await admin
    .from('comments')
    .update({ content: tokenizedBody })
    .eq('id', commentId)
    .select('id, user_id, content, user_name, parent_id, created_at, post_type, post_id')
    .single()
  if (updErr) {
    return NextResponse.json(
      { error: 'Failed to update comment' },
      { status: 500 },
    )
  }

  return NextResponse.json({
    comment: updated,
    mentionedCount: mentionedUuids.length,
    mentionedUuids,
  })
}
