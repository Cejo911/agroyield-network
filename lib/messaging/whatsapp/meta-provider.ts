/**
 * Meta (Facebook) WhatsApp Business API provider — SCAFFOLD.
 *
 * Status: NOT ACTIVE. Methods throw on invocation to prevent
 * accidental use before Meta Business Verification completes
 * and templates are migrated.
 *
 * Activation criteria (per UNICORN_SPRINT.md):
 *   1. Meta Business Verification approved
 *   2. Dedicated WhatsApp number provisioned (Path B)
 *   3. Templates re-approved under your own WABA
 *   4. Monthly volume exceeds ~3,000 messages sustained
 *
 * When ready, fill in the three method bodies using fetch() calls
 * to https://graph.facebook.com/v20.0/{PHONE_NUMBER_ID}/messages
 */

import type {
  WhatsAppProvider,
  SendResult,
  StatusResult,
} from './provider'
import type { TemplateName } from './templates'

export class MetaProvider implements WhatsAppProvider {
  readonly name = 'meta' as const

  private accessToken: string
  private phoneNumberId: string
  private wabaId: string

  constructor() {
    const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN
    const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID
    const wabaId = process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID

    if (!accessToken) throw new Error('META_WHATSAPP_ACCESS_TOKEN is not set')
    if (!phoneNumberId) throw new Error('META_WHATSAPP_PHONE_NUMBER_ID is not set')
    if (!wabaId) throw new Error('META_WHATSAPP_BUSINESS_ACCOUNT_ID is not set')

    this.accessToken = accessToken
    this.phoneNumberId = phoneNumberId
    this.wabaId = wabaId
  }

  async sendTemplate(_params: {
    to: string
    templateName: TemplateName
    variables: Record<string, string | number>
  }): Promise<SendResult> {
    throw new Error(
      'MetaProvider.sendTemplate not implemented. ' +
      'Activate this provider only after Meta Business Verification, ' +
      'Path B number provisioning, and template re-approval.'
    )
  }

  async getStatus(_messageId: string): Promise<StatusResult> {
    throw new Error(
      'MetaProvider.getStatus not implemented. ' +
      'Meta uses webhooks for delivery status, not polling. ' +
      'Wire up a webhook handler in Week 8 of the sprint.'
    )
  }

  // Note: getBalance is NOT defined here.
  // Meta uses postpaid billing, so the optional method stays absent.
  // Code calling provider.getBalance?.() safely skips this on Meta.
}