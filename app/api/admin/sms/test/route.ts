import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAdminAction } from '@/lib/admin/audit-log'
import { sendSms, getSmsBalance, isSmsChannel } from '@/lib/messaging/sms/termii-sms'
import type { SmsChannel } from '@/lib/messaging/sms/termii-sms'
import { toTermiiDigits, splitPhoneCandidates } from '@/lib/messaging/utils/phone'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

/**
 * Admin SMS test endpoint.
 *
 * GET  — returns the current Termii wallet balance + configured sender ID.
 *        Lets the admin UI show credit before firing a test send.
 *
 * POST — sends a plain-text SMS to one or more test recipients.
 *        Body: {
 *          to: string | string[],
 *          message: string,
 *          senderId?: string,
 *          channel?: 'generic' | 'dnd' | 'whatsapp'
 *        }
 *        The `to` field accepts either an array OR a string containing
 *        multiple numbers separated by commas / semicolons / newlines.
 *        The `channel` field overrides TERMII_SMS_CHANNEL for this send —
 *        useful for A/B testing DND bypass from the admin panel.
 *        Super admin only. Rate limited 5 calls/min per admin (not per
 *        recipient — the whole blast counts as one call).
 *
 * Recipient cap: 10 per request. Keeps thumb-slips from draining the wallet
 * and keeps per-request latency bounded — Termii is a sequential API call
 * per number, no native multi-recipient endpoint for plain SMS.
 *
 * Every attempt is audit-logged (admin_audit_log) with the target phone
 * numbers masked (last 4 digits visible), provider message_ids, and a
 * per-recipient success flag.
 */

const MAX_RECIPIENTS_PER_SEND = 10

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

/** Mask all but the last 4 digits of a phone number for logs. */
function maskPhone(phone: string): string {
  if (phone.length <= 4) return phone
  return `${'*'.repeat(phone.length - 4)}${phone.slice(-4)}`
}

export async function GET() {
  const auth = await requireSuperAdmin()
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const balance = await getSmsBalance()
  return NextResponse.json({
    ok: true,
    senderId: process.env.TERMII_SMS_SENDER_ID || 'AgroYield',
    channel: process.env.TERMII_SMS_CHANNEL || 'generic',
    balance: balance.success ? balance.balance : null,
    currency: balance.success ? balance.currency : null,
    balanceError: balance.success ? null : balance.error,
  })
}

interface RecipientResult {
  input: string
  to: string | null   // masked normalised number, null if normalisation failed
  success: boolean
  messageId?: string
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin()
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    // 5 calls/min per admin to prevent thumb-slip blasts. Note this is per
    // *call*, not per recipient — sending to 10 numbers in one request still
    // counts as 1 tick against the limiter.
    const rl = rateLimit(`sms-test:${auth.user!.id}`, { limit: 5, windowMs: 60_000 })
    if (!rl.success) return rateLimitResponse()

    const body = (await request.json()) as {
      to?: string | string[]
      message?: string
      senderId?: string
      channel?: string
    }

    if (body.to === undefined || body.to === null) {
      return NextResponse.json({ error: 'Missing "to" (phone number)' }, { status: 400 })
    }
    if (!body.message || typeof body.message !== 'string') {
      return NextResponse.json({ error: 'Missing "message" (SMS body)' }, { status: 400 })
    }

    // Channel override — opt-in, validated. If omitted, sendSms picks up
    // TERMII_SMS_CHANNEL from env (or 'generic' as the final fallback).
    let channelOverride: SmsChannel | undefined
    if (body.channel !== undefined && body.channel !== null && body.channel !== '') {
      if (!isSmsChannel(body.channel)) {
        return NextResponse.json(
          { error: `Invalid channel "${body.channel}". Expected: generic | dnd | whatsapp` },
          { status: 400 },
        )
      }
      channelOverride = body.channel
    }

    // Build the candidate list. Accept either an array (from a future
    // programmatic caller) or a single string with separators (from the
    // current UI). Splitting a single-number string just returns [that one].
    let candidates: string[] = []
    if (Array.isArray(body.to)) {
      for (const entry of body.to) {
        if (typeof entry !== 'string') continue
        candidates.push(...splitPhoneCandidates(entry))
      }
      // Re-dedup across array entries
      candidates = Array.from(new Set(candidates))
    } else if (typeof body.to === 'string') {
      candidates = splitPhoneCandidates(body.to)
    } else {
      return NextResponse.json({ error: '"to" must be a string or array of strings' }, { status: 400 })
    }

    if (candidates.length === 0) {
      return NextResponse.json({ error: 'No phone numbers provided' }, { status: 400 })
    }
    if (candidates.length > MAX_RECIPIENTS_PER_SEND) {
      return NextResponse.json(
        { error: `Too many recipients (${candidates.length}). Max ${MAX_RECIPIENTS_PER_SEND} per send.` },
        { status: 400 },
      )
    }

    // Send to each recipient sequentially. Parallel fan-out would be faster
    // but Termii's per-account rate limit is low enough that we'd risk
    // 429s from the provider — sequential keeps things predictable and the
    // UI latency acceptable (10 recipients ≈ 3-4s total).
    const results: RecipientResult[] = []
    let lastBalance: number | null = null

    for (const raw of candidates) {
      let normalised: string
      try {
        normalised = toTermiiDigits(raw)
      } catch (err) {
        results.push({
          input: raw,
          to: null,
          success: false,
          error: err instanceof Error ? err.message : 'Invalid phone',
        })
        continue
      }

      const result = await sendSms({
        to: normalised,
        message: body.message,
        senderId: body.senderId,
        channel: channelOverride,
      })

      if (result.success) {
        if (typeof result.balance === 'number') lastBalance = result.balance
        results.push({
          input: raw,
          to: maskPhone(normalised),
          success: true,
          messageId: result.messageId,
        })
      } else {
        results.push({
          input: raw,
          to: maskPhone(normalised),
          success: false,
          error: result.error,
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.length - successCount

    // One audit row per request, carrying per-recipient detail. Keeps the
    // audit log compact (N recipients = 1 row, not N rows) while preserving
    // traceability.
    await logAdminAction({
      adminId: auth.user!.id,
      action: 'sms.test_send',
      targetType: 'sms',
      // Use a comma-joined list of masked phones as the target id so a
      // search on a particular number still surfaces the row.
      targetId: results.map(r => r.to ?? r.input).join(','),
      details: {
        recipients: results.length,
        success: successCount,
        failure: failureCount,
        senderId: body.senderId || process.env.TERMII_SMS_SENDER_ID || 'AgroYield',
        channel: channelOverride || process.env.TERMII_SMS_CHANNEL || 'generic',
        bytes: body.message.length,
        perRecipient: results.map(r => ({
          to: r.to ?? r.input,
          success: r.success,
          messageId: r.messageId ?? null,
          error: r.error ?? null,
        })),
      },
    })

    // HTTP status shape: 200 if at least one succeeded, 502 if all failed.
    // Partial failures still return 200 so the UI can render per-recipient
    // detail instead of a blanket error box.
    return NextResponse.json(
      {
        ok: successCount > 0,
        recipients: results.length,
        successCount,
        failureCount,
        balance: lastBalance,
        results,
      },
      { status: successCount > 0 ? 200 : 502 },
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
