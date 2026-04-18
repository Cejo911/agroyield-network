/**
 * Termii plain SMS helper.
 *
 * Separate from the WhatsApp template provider in lib/messaging/whatsapp/.
 * Used for diagnostic tests, OTP-adjacent flows, and any one-off plain-text
 * SMS we need to fire from the server.
 *
 * Envs:
 *   TERMII_API_KEY           required — same key used by the WA provider
 *   TERMII_SMS_SENDER_ID     sender ID as registered with Termii (default: "Fastbeep")
 *   TERMII_SMS_CHANNEL       "generic" | "dnd" | "whatsapp" (default: "generic")
 *   TERMII_BASE_URL          optional override (default: https://api.ng.termii.com)
 *
 * Termii endpoint: POST /api/sms/send
 *   { api_key, to, from, sms, type: "plain", channel }
 */

export interface SmsSendResult {
  success: boolean
  messageId?: string
  balance?: number
  error?: string
  providerRaw?: unknown
}

const TERMII_BASE_URL =
  process.env.TERMII_BASE_URL || 'https://api.ng.termii.com'

/**
 * Normalise a phone number into Termii's expected format.
 * Termii wants digits only, with country code, no leading +.
 *   "+2348012345678"  → "2348012345678"
 *   "08012345678"     → "2348012345678" (assumes Nigeria)
 *   "2348012345678"   → "2348012345678"
 */
export function toTermiiPhone(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) throw new Error('Phone number is empty')

  // Strip spaces, dashes, parens
  const digits = trimmed.replace(/[^\d+]/g, '')

  if (digits.startsWith('+')) return digits.slice(1)
  if (digits.startsWith('234')) return digits
  if (digits.startsWith('0')) return `234${digits.slice(1)}`
  return digits
}

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
  /** Optional override; falls back to TERMII_SMS_SENDER_ID or "Fastbeep". */
  senderId?: string
  /** Optional override; falls back to TERMII_SMS_CHANNEL or "generic". */
  channel?: 'generic' | 'dnd' | 'whatsapp'
}): Promise<SmsSendResult> {
  try {
    const apiKey = process.env.TERMII_API_KEY
    if (!apiKey) {
      return { success: false, error: 'TERMII_API_KEY is not set' }
    }

    const senderId =
      params.senderId || process.env.TERMII_SMS_SENDER_ID || 'Fastbeep'
    const channel =
      params.channel ||
      (process.env.TERMII_SMS_CHANNEL as 'generic' | 'dnd' | 'whatsapp') ||
      'generic'

    const message = (params.message || '').trim()
    if (!message) return { success: false, error: 'Message body is empty' }
    if (message.length > 918) {
      return { success: false, error: 'Message too long (max 918 chars / 6 segments)' }
    }

    const phone = toTermiiPhone(params.to)

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
