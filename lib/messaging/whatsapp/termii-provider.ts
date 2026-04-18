/**
 * Termii WhatsApp provider.
 *
 * Implements WhatsAppProvider by calling Termii's REST API.
 * All Termii-specific quirks (phone format, status strings,
 * payload shape) are isolated to this file.
 */

import type {
  WhatsAppProvider,
  SendResult,
  StatusResult,
  MessageStatus,
} from './provider'
import type { TemplateName } from './templates'
import { validateTemplateInput, TEMPLATES } from './templates'
import { toTermiiDigits } from '../utils/phone'

const TERMII_BASE_URL =
  process.env.TERMII_BASE_URL || 'https://api.ng.termii.com'

export class TermiiProvider implements WhatsAppProvider {
  readonly name = 'termii' as const

  private apiKey: string
  private senderId: string

  constructor() {
    const apiKey = process.env.TERMII_API_KEY
    const senderId = process.env.TERMII_SENDER_ID

    if (!apiKey) throw new Error('TERMII_API_KEY is not set')
    if (!senderId) throw new Error('TERMII_SENDER_ID is not set')

    this.apiKey = apiKey
    this.senderId = senderId
  }

  async sendTemplate(params: {
    to: string
    templateName: TemplateName
    variables: Record<string, string | number>
  }): Promise<SendResult> {
    try {
      validateTemplateInput(params.templateName, params.variables)

      const phone = toTermiiDigits(params.to)

      const payload = {
        api_key: this.apiKey,
        phone_number: phone,
        device_id: this.senderId,
        template_id: params.templateName,
        data: this.buildDataObject(params.templateName, params.variables),
      }

      const response = await fetch(`${TERMII_BASE_URL}/api/send/template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await response.json()

      if (!response.ok || json.code !== 'ok') {
        return {
          success: false,
          error: json.message || `Termii returned HTTP ${response.status}`,
          providerRaw: json,
        }
      }

      return {
        success: true,
        messageId: json.message_id,
        providerRaw: json,
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }
    }
  }

  async getStatus(messageId: string): Promise<StatusResult> {
    const url = new URL(`${TERMII_BASE_URL}/api/sms/inbox`)
    url.searchParams.set('api_key', this.apiKey)
    url.searchParams.set('message_id', messageId)

    const response = await fetch(url.toString())
    const json = await response.json()

    return {
      messageId,
      status: this.mapStatus(json.status),
      timestamp: new Date(),
      providerRaw: json,
    }
  }

  async getBalance(): Promise<{ balance: number; currency: string }> {
    const url = new URL(`${TERMII_BASE_URL}/api/get-balance`)
    url.searchParams.set('api_key', this.apiKey)

    const response = await fetch(url.toString())
    const json = await response.json()

    return {
      balance: Number(json.balance ?? 0),
      currency: json.currency ?? 'NGN',
    }
  }

  private buildDataObject(
    templateName: TemplateName,
    variables: Record<string, string | number>
  ): Record<string, string> {
    const template = TEMPLATES[templateName]
    const data: Record<string, string> = {}
    for (const varName of template.variables) {
      data[varName] = String(variables[varName])
    }
    return data
  }

  private mapStatus(termiiStatus: string | undefined): MessageStatus {
    const s = (termiiStatus || '').toLowerCase()
    if (s === 'delivered') return 'delivered'
    if (s === 'sent' || s === 'successful') return 'sent'
    if (s === 'failed' || s === 'rejected') return 'failed'
    if (s === 'read') return 'read'
    return 'queued'
  }
}