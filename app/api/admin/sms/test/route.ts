import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAdminAction } from '@/lib/admin/audit-log'
import { sendSms, getSmsBalance } from '@/lib/messaging/sms/termii-sms'
import { toTermiiDigits } from '@/lib/messaging/utils/phone'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

/**
 * Admin SMS test endpoint.
 *
 * GET  — returns the current Termii wallet balance + configured sender ID.
 *        Lets the admin UI show credit before firing a test send.
 *
 * POST — sends a single plain-text SMS to a test recipient.
 *        Body: { to: string, message: string, senderId?: string }
 *        Super admin only. Rate limited 5/min per admin user.
 *
 * Every send is audit-logged (admin_audit_log) with the target phone
 * (last 4 digits masked), byte length, and provider message_id.
 */

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
    senderId: process.env.TERMII_SMS_SENDER_ID || 'Fastbeep',
    channel: process.env.TERMII_SMS_CHANNEL || 'generic',
    balance: balance.success ? balance.balance : null,
    currency: balance.success ? balance.currency : null,
    balanceError: balance.success ? null : balance.error,
  })
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin()
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    // 5 sends/min per admin to prevent thumb-slip blasts
    const rl = rateLimit(`sms-test:${auth.user!.id}`, { limit: 5, windowMs: 60_000 })
    if (!rl.success) return rateLimitResponse()

    const body = (await request.json()) as {
      to?: string
      message?: string
      senderId?: string
    }

    if (!body.to || typeof body.to !== 'string') {
      return NextResponse.json({ error: 'Missing "to" (phone number)' }, { status: 400 })
    }
    if (!body.message || typeof body.message !== 'string') {
      return NextResponse.json({ error: 'Missing "message" (SMS body)' }, { status: 400 })
    }

    // Validate phone early — gives a clearer error than Termii's generic rejection
    let normalisedPhone: string
    try {
      normalisedPhone = toTermiiDigits(body.to)
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Invalid phone' },
        { status: 400 }
      )
    }

    const result = await sendSms({
      to: normalisedPhone,
      message: body.message,
      senderId: body.senderId,
    })

    // Audit log every attempt — success or failure
    await logAdminAction({
      adminId: auth.user!.id,
      action: 'sms.test_send',
      targetType: 'sms',
      targetId: maskPhone(normalisedPhone),
      details: {
        success: result.success,
        messageId: result.messageId ?? null,
        senderId: body.senderId || process.env.TERMII_SMS_SENDER_ID || 'Fastbeep',
        bytes: body.message.length,
        error: result.error ?? null,
      },
    })

    if (!result.success) {
      return NextResponse.json(
        { ok: false, error: result.error, providerRaw: result.providerRaw },
        { status: 502 }
      )
    }

    return NextResponse.json({
      ok: true,
      messageId: result.messageId,
      balance: result.balance,
      to: maskPhone(normalisedPhone),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
