import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSmsStatus } from '@/lib/messaging/sms/termii-sms'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

/**
 * Admin SMS delivery-report endpoint.
 *
 * GET /api/admin/sms/test/status?ids=<id1>,<id2>,<id3>
 *
 * Looks up carrier-side delivery status on Termii for each provided
 * message_id and returns a flat array of per-id results. The underlying
 * Termii endpoint (/api/sms/inbox?message_id=...) returns either the
 * delivered / sent / failed / queued status or a rejection reason like
 * "DND Active on Phone Number" / "Invalid Sender Id" — which is exactly
 * the information the SMS Test panel needs to tell the difference between
 * "Termii accepted the send" and "the phone actually received it".
 *
 * Why this matters: POST /api/admin/sms/test returns success whenever
 * Termii accepts the send, but Termii can accept a send that the carrier
 * will later drop (DND, sender-ID-not-whitelisted, country inactive…).
 * This endpoint gives the admin visibility into the second half of that
 * journey.
 *
 * Super admin only. Rate limited 20 calls/min per admin — lookups are
 * cheap but we don't want a bug in the UI spamming Termii.
 *
 * Cap: 10 ids per call, matches MAX_RECIPIENTS_PER_SEND in the POST route
 * so a single blast's results can be looked up in one request.
 */

const MAX_IDS_PER_LOOKUP = 10

async function requireSuperAdmin() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 as const, user: null }

  const { data: profile } = await supabaseAny
    .from('profiles').select('is_admin, admin_role').eq('id', user.id).single()
  const p = profile as Record<string, unknown> | null
  if (!p?.is_admin || p.admin_role !== 'super') {
    return { error: 'Forbidden — super admin only', status: 403 as const, user: null }
  }
  return { error: null, status: 200 as const, user }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin()
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const rl = rateLimit(`sms-status:${auth.user!.id}`, { limit: 20, windowMs: 60_000 })
    if (!rl.success) return rateLimitResponse()

    const idsParam = request.nextUrl.searchParams.get('ids') || ''
    // Same separator set as phone splitting — paste tolerance is cheap.
    const ids = Array.from(
      new Set(
        idsParam
          .split(/[,;\n\r\t]+/)
          .map(s => s.trim())
          .filter(Boolean),
      ),
    )

    if (ids.length === 0) {
      return NextResponse.json(
        { error: 'Missing "ids" query param (comma-separated message_ids)' },
        { status: 400 },
      )
    }
    if (ids.length > MAX_IDS_PER_LOOKUP) {
      return NextResponse.json(
        { error: `Too many ids (${ids.length}). Max ${MAX_IDS_PER_LOOKUP} per lookup.` },
        { status: 400 },
      )
    }

    // Sequential lookup — same reasoning as the send loop. Termii's rate
    // limit applies across endpoints and sequential keeps us safely under.
    // 10 lookups ≈ 2s total, acceptable for a click-to-refresh action.
    const results = []
    for (const id of ids) {
      const r = await getSmsStatus(id)
      results.push({
        messageId: id,
        success: r.success,
        status: r.status,
        rawStatus: r.rawStatus ?? null,
        reason: r.reason ?? null,
        error: r.error ?? null,
      })
    }

    return NextResponse.json({ ok: true, results })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
