/**
 * Termii plain SMS helper.
 *
 * Separate from the WhatsApp template provider in lib/messaging/whatsapp/.
 * Used for diagnostic tests, OTP-adjacent flows, and any one-off plain-text
 * SMS we need to fire from the server.
 *
 * Envs:
 *   TERMII_API_KEY           required — same key used by the WA provider
 *   TERMII_SMS_SENDER_ID     sender ID as registered with Termii (default: "AgroYield")
 *   TERMII_SMS_CHANNEL       "generic" | "dnd" | "whatsapp" (default: "generic")
 *   TERMII_BASE_URL          optional override (default: https://api.ng.termii.com)
 *
 * Termii endpoint: POST /api/sms/send
 *   { api_key, to, from, sms, type: "plain", channel }
 */

import { toTermiiDigits } from '../utils/phone'

/**
 * Termii SMS channel.
 *   generic  — default, route through the cheapest available carrier path.
 *              Silently dropped for numbers on the Nigerian DND registry.
 *   dnd      — route through the DND-exempt path. More expensive but
 *              reaches numbers on the DND list (most personal phones).
 *   whatsapp — route via WhatsApp-over-SMS fallback (rarely used in prod).
 */
export type SmsChannel = 'generic' | 'dnd' | 'whatsapp'

/** Type guard — keeps route handlers honest about accepted values. */
export function isSmsChannel(value: unknown): value is SmsChannel {
  return value === 'generic' || value === 'dnd' || value === 'whatsapp'
}

export interface SmsSendResult {
  success: boolean
  messageId?: string
  balance?: number
  error?: string
  providerRaw?: unknown
}

/**
 * Carrier-side delivery status, normalised across Termii's raw vocabulary.
 *   queued     — Termii accepted the send but the carrier hasn't reported back
 *   sent       — Carrier accepted, handoff complete (not yet on the handset)
 *   delivered  — Handset confirmed receipt
 *   failed     — Carrier rejected (DND, invalid sender ID, invalid number…)
 *   unknown    — Termii returned a shape we don't recognise; inspect providerRaw
 */
export type SmsDeliveryStatus =
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'unknown'

export interface SmsStatusResult {
  success: boolean
  messageId: string
  status: SmsDeliveryStatus
  /** Raw Termii status string so the UI can show the provider's own wording. */
  rawStatus?: string
  /** Populated when Termii surfaces a rejection reason. */
  reason?: string
  error?: string
  providerRaw?: unknown
}

const TERMII_BASE_URL =
  process.env.TERMII_BASE_URL || 'https://api.ng.termii.com'

interface TermiiSmsResponse {
  message_id?: string
  message?: string
  code?: string
  balance?: number
  [key: string]: unknown
}

/**
 * Fire a single plain-text SMS via Termii.
 * Never throws — returns a SendResult. Callers decide how to handle failures.
 */
export async function sendSms(params: {
  to: string
  message: string
  /** Optional override; falls back to TERMII_SMS_SENDER_ID or "AgroYield". */
  senderId?: string
  /** Optional override; falls back to TERMII_SMS_CHANNEL or "generic". */
  channel?: SmsChannel
}): Promise<SmsSendResult> {
  try {
    const apiKey = process.env.TERMII_API_KEY
    if (!apiKey) {
      return { success: false, error: 'TERMII_API_KEY is not set' }
    }

    // Termii approved the "AgroYield" sender ID on 20 Apr 2026; that's the
    // production default. "Fastbeep" was the interim Termii-issued test sender
    // used during credential validation before the brand sender was approved.
    const senderId =
      params.senderId || process.env.TERMII_SMS_SENDER_ID || 'AgroYield'
    const channel: SmsChannel =
      params.channel ||
      (process.env.TERMII_SMS_CHANNEL as SmsChannel) ||
      'generic'

    const message = (params.message || '').trim()
    if (!message) return { success: false, error: 'Message body is empty' }
    if (message.length > 918) {
      return { success: false, error: 'Message too long (max 918 chars / 6 segments)' }
    }

    const phone = toTermiiDigits(params.to)

    const payload = {
      api_key: apiKey,
      to: phone,
      from: senderId,
      sms: message,
      type: 'plain',
      channel,
    }

    const response = await fetch(`${TERMII_BASE_URL}/api/sms/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const json = (await response.json()) as TermiiSmsResponse

    if (!response.ok || (json.code && json.code !== 'ok')) {
      return {
        success: false,
        error: json.message || `Termii returned HTTP ${response.status}`,
        providerRaw: json,
      }
    }

    return {
      success: true,
      messageId: json.message_id,
      balance: typeof json.balance === 'number' ? json.balance : undefined,
      providerRaw: json,
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown send error',
    }
  }
}

/**
 * Map Termii's raw status strings to our normalised union.
 * Lowercased for robustness — Termii has been inconsistent with casing
 * across account ages (older accounts: "Delivered", newer: "DELIVERED").
 *
 * Termii's full set of raw statuses (observed in production):
 *   Sent / Delivered / Received / Expired / Rejected / Failed /
 *   "DND Active on Phone Number" / "Invalid Sender Id"
 */
function mapTermiiSmsStatus(raw: string | undefined): SmsDeliveryStatus {
  const s = (raw || '').toLowerCase().trim()
  if (!s) return 'unknown'
  if (s === 'delivered' || s === 'received') return 'delivered'
  if (s === 'sent' || s === 'successful' || s === 'dispatched') return 'sent'
  if (
    s === 'failed' ||
    s === 'rejected' ||
    s === 'expired' ||
    s.includes('dnd') ||
    s.includes('invalid sender')
  ) {
    return 'failed'
  }
  if (s === 'queued' || s === 'pending' || s === 'processing') return 'queued'
  return 'unknown'
}

/**
 * Look up the carrier-side delivery status of a previously sent SMS.
 *
 * Uses Termii's message-history endpoint, the same one the WA provider hits
 * for its own status lookups (see lib/messaging/whatsapp/termii-provider.ts
 * — we mirror that pattern so both providers speak the same dialect).
 *
 *   GET /api/sms/inbox?api_key=xxx&message_id=xxx
 *
 * Termii returns either a single object or `{ data: [...] }` depending on
 * account age — we accept both shapes and pull the first record out. If
 * the shape is unexpected the caller gets status='unknown' + providerRaw
 * so the UI can display the raw payload for debugging.
 *
 * Never throws — returns { success, status } on any outcome.
 */
export async function getSmsStatus(messageId: string): Promise<SmsStatusResult> {
  try {
    const apiKey = process.env.TERMII_API_KEY
    if (!apiKey) {
      return {
        success: false,
        messageId,
        status: 'unknown',
        error: 'TERMII_API_KEY is not set',
      }
    }

    const url = new URL(`${TERMII_BASE_URL}/api/sms/inbox`)
    url.searchParams.set('api_key', apiKey)
    url.searchParams.set('message_id', messageId)

    const response = await fetch(url.toString())
    const json = (await response.json()) as
      | { data?: Array<Record<string, unknown>>; message?: string; status?: string }
      | Record<string, unknown>

    if (!response.ok) {
      // Termii returns { message } on errors
      const errMsg =
        (json as { message?: string })?.message ||
        `Termii returned HTTP ${response.status}`
      return {
        success: false,
        messageId,
        status: 'unknown',
        error: errMsg,
        providerRaw: json,
      }
    }

    // Normalise the two shapes Termii returns. `.data[0]` for list-style,
    // top-level object for single-record style. Fall back to top-level.
    const envelope = json as { data?: Array<Record<string, unknown>> }
    const record: Record<string, unknown> =
      Array.isArray(envelope.data) && envelope.data.length > 0
        ? envelope.data[0]
        : (json as Record<string, unknown>)

    const rawStatus =
      (record.status as string | undefined) ??
      (record.message_status as string | undefined) ??
      (record.delivery_status as string | undefined)

    const reason =
      (record.error as string | undefined) ??
      (record.failure_reason as string | undefined) ??
      (record.message as string | undefined)

    return {
      success: true,
      messageId,
      status: mapTermiiSmsStatus(rawStatus),
      rawStatus,
      reason: typeof reason === 'string' ? reason : undefined,
      providerRaw: json,
    }
  } catch (err) {
    return {
      success: false,
      messageId,
      status: 'unknown',
      error: err instanceof Error ? err.message : 'Unknown status error',
    }
  }
}

/**
 * Check Termii wallet balance. Handy for the admin test panel
 * so we can show credit before firing a send.
 */
export async function getSmsBalance(): Promise<{
  success: boolean
  balance?: number
  currency?: string
  error?: string
}> {
  try {
    const apiKey = process.env.TERMII_API_KEY
    if (!apiKey) return { success: false, error: 'TERMII_API_KEY is not set' }

    const url = new URL(`${TERMII_BASE_URL}/api/get-balance`)
    url.searchParams.set('api_key', apiKey)

    const response = await fetch(url.toString())
    const json = (await response.json()) as {
      balance?: number | string
      currency?: string
      message?: string
    }

    if (!response.ok) {
      return {
        success: false,
        error: json.message || `Termii returned HTTP ${response.status}`,
      }
    }

    return {
      success: true,
      balance: Number(json.balance ?? 0),
      currency: json.currency ?? 'NGN',
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown balance error',
    }
  }
}
