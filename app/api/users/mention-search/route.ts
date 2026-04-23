// app/api/users/mention-search/route.ts
//
// GET /api/users/mention-search?q=<prefix>
//
// Typeahead endpoint for the @-mention picker in comment composers.
// Spec: docs/features/mentions.md §5.1.
//
// Visibility scope
// ----------------
// Only returns profiles the caller has an accepted connection with.
// This matches the RLS policy on public.comment_mentions (see
// supabase/migrations/20260422_comment_mentions.sql §4) — if we showed
// the user a match they couldn't actually @-mention, the mention would
// fail at insert time with an unfriendly RLS error. The endpoint's
// visibility rule is the same as the INSERT policy's so the UI can
// render the picker without prefetching RLS state.
//
// Defence in depth
// ----------------
// §4.1 of the spec (which comment table is canonical) is still OPEN at
// the time this endpoint ships, which is why comment_mentions_enabled
// is seeded OFF at launch. To prevent the surface from leaking before
// the feature is officially on, this route returns 404 when the flag is
// off — not 403 or an empty array — so that even if someone finds the
// URL they can't tell the endpoint exists. Frontend-only gating isn't
// enough; this is the backstop.
//
// Rate limiting
// -------------
// 30 requests/minute per IP, per §5.2 abuse guards. The typeahead
// debounces client-side at 150ms so a legitimate user never comes close;
// the cap exists to stop a scraper from using this as an auth'd user
// directory dump. Rate limit key is per-IP (not per-user) because the
// scraping case is the one that matters — rolling IPs is harder than
// rolling accounts.
//
// Response shape
// --------------
//   200: { results: [{ id, username, display_name, avatar_url, institution }] }
//   400: missing or too-short q
//   401: not authed
//   404: feature disabled (see "Defence in depth" above)
//   429: rate limited
//
// Results are capped at 8 rows — enough to fill the picker without
// pushing the "keep typing" UX downrange.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { escapeIlike } from '@/lib/global-search'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

// Spec §5.1: max 8 results. Anything beyond that is a UX smell — if the
// prefix is that short, the user should type more.
const MAX_RESULTS = 8
const MIN_QUERY_LEN = 2
const MAX_QUERY_LEN = 100

// Spec §5.2: 30 mention-search calls per minute per IP.
const RATE_LIMIT = 30
const RATE_WINDOW_MS = 60_000

// Return 404 rather than 403/empty so the endpoint is opaque when off.
function notFound() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

export async function GET(request: NextRequest) {
  // -- 1. Feature flag gate (hardest stop — runs before auth so we don't
  //       leak "endpoint exists but you're not logged in" signal either).
  const enabled = await isFeatureEnabled('comment_mentions_enabled')
  if (!enabled) return notFound()

  // -- 2. Rate limit (before auth — spammers don't need a free auth check).
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const { success } = rateLimit(ip, {
    limit: RATE_LIMIT,
    windowMs: RATE_WINDOW_MS,
  })
  if (!success) return rateLimitResponse()

  // -- 3. Auth.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // -- 4. Query parsing.
  const rawQ = request.nextUrl.searchParams.get('q') ?? ''
  const q = rawQ.trim().slice(0, MAX_QUERY_LEN)
  if (q.length < MIN_QUERY_LEN) {
    return NextResponse.json({ results: [] })
  }

  // -- 5. Accepted connections: who can I @-mention?
  // One small query; Beta users have O(10s) of connections each — the
  // subsequent .in() filter stays well under PostgREST's URL limits.
  const { data: connRows, error: connErr } = await supabase
    .from('connections')
    .select('requester_id, recipient_id, status')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)

  if (connErr) {
    // RLS denial or transient — fail closed with an empty list rather
    // than 500. Picker UI handles empty gracefully.
    return NextResponse.json({ results: [] })
  }

  const connectedIds = new Set<string>()
  for (const row of (connRows ?? []) as Array<{
    requester_id: string
    recipient_id: string
  }>) {
    const other =
      row.requester_id === user.id ? row.recipient_id : row.requester_id
    connectedIds.add(other)
  }

  if (connectedIds.size === 0) {
    // No connections yet — nothing mention-able. Short-circuit.
    return NextResponse.json({ results: [] })
  }

  // -- 6. Profile search within the connection set.
  // ILIKE across the fields the picker displays; trigram GIN indexes
  // from 20260420_global_search_trgm.sql accelerate these scans.
  const pat = `%${escapeIlike(q)}%`
  const { data: profileRows, error: profileErr } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name, avatar_url, institution')
    .in('id', Array.from(connectedIds))
    .or(
      `username.ilike.${pat},first_name.ilike.${pat},last_name.ilike.${pat},institution.ilike.${pat}`,
    )
    .eq('is_suspended', false)
    .limit(MAX_RESULTS)

  if (profileErr) {
    return NextResponse.json({ results: [] })
  }

  type ProfileRow = {
    id: string
    username: string | null
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
    institution: string | null
  }

  const results = ((profileRows ?? []) as ProfileRow[]).map((p) => ({
    id: p.id,
    username: p.username,
    display_name:
      [p.first_name, p.last_name].filter(Boolean).join(' ').trim() ||
      p.username ||
      'Member',
    avatar_url: p.avatar_url,
    institution: p.institution,
  }))

  return NextResponse.json({ results })
}
