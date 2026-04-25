// app/api/community/post/route.ts
//
// User-facing community post mutations (currently: soft-delete).
//
// Why this exists
// ---------------
// Direct browser supabase.from('community_posts').update(...) calls were
// silently failing in production — same pattern shape as the
// /api/report insert and the business-logos storage upload bugs hit
// earlier this week. Without an error check on the await, the user
// sees the confirm dialog, clicks "yes", page refreshes, and the post
// is still there. No surfaceable error.
//
// Rather than chase the underlying gate (RLS edge case, FORCE ROW
// LEVEL SECURITY default, dashboard-edited policy, etc.), route the
// mutation through a server endpoint with explicit ownership checks
// in code. Same security model as a properly-configured RLS policy,
// just with a debugging surface we can actually see.
//
// Method
// ------
// DELETE /api/community/post
//   Body: { postId: string }
//   200:  { ok: true, postId }
//   400:  invalid body / missing postId
//   401:  not authed
//   403:  post belongs to another user
//   404:  post does not exist
//   500:  unexpected DB error
//
// Soft-delete semantics: we set is_active=false rather than DELETE FROM.
// Mirrors the rest of the platform's moderation columns and keeps the
// row intact for audit / undelete. The community feed query already
// filters on is_active, so the post disappears for everyone else
// immediately. We don't blank `content` (unlike /api/admin/community's
// 'delete' action) because this is a user self-delete, not a moderator
// take-down — keeping the original text reduces the ambiguity if the
// user later asks "where did my post go?".

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

const RATE_LIMIT_DELETES = 30
const RATE_WINDOW_MS = 60_000

function getIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  )
}

export async function DELETE(request: NextRequest) {
  // 1. Rate limit (per IP). 30/min covers reasonable cleanup bursts
  //    without leaving the endpoint open to a runaway script.
  const { success } = rateLimit(getIp(request), {
    limit: RATE_LIMIT_DELETES,
    windowMs: RATE_WINDOW_MS,
  })
  if (!success) return rateLimitResponse()

  // 2. Auth via SSR cookie.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 3. Body validation.
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const postId = typeof body.postId === 'string' ? body.postId : ''
  if (!postId) {
    return NextResponse.json({ error: 'postId required' }, { status: 400 })
  }

  // 4. Ownership check via admin client. Using the admin client here
  //    sidesteps any RLS state on community_posts that might silently
  //    exclude the row from the SSR client's view — the security check
  //    is then expressed in plain code below.
  const admin = getSupabaseAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any
  const { data: post, error: lookupErr } = await adminAny
    .from('community_posts')
    .select('id, user_id, is_active')
    .eq('id', postId)
    .maybeSingle()
  if (lookupErr) {
    console.error('[community/post DELETE] lookup failed:', lookupErr)
    return NextResponse.json(
      { error: 'Failed to verify post ownership' },
      { status: 500 },
    )
  }
  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }
  if (post.user_id !== user.id) {
    return NextResponse.json(
      { error: 'You can only delete your own posts' },
      { status: 403 },
    )
  }

  // Already soft-deleted — make this idempotent so a double-tap doesn't
  // surface a confusing 404 on the second click.
  if (post.is_active === false) {
    return NextResponse.json({ ok: true, postId, alreadyDeleted: true })
  }

  // 5. Soft-delete via admin client. Service role bypasses RLS; the
  //    ownership check above is the actual authorisation gate.
  const { error: updateErr } = await adminAny
    .from('community_posts')
    .update({ is_active: false })
    .eq('id', postId)

  if (updateErr) {
    console.error('[community/post DELETE] soft-delete failed:', {
      postId,
      userId: user.id,
      message: updateErr.message,
      details: (updateErr as Record<string, unknown>).details,
      code: (updateErr as Record<string, unknown>).code,
    })
    return NextResponse.json(
      { error: updateErr.message || 'Failed to delete post' },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true, postId })
}
