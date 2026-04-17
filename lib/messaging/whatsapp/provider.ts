/**
 * WhatsApp provider interface.
 *
 * Both the Termii (launch) and Meta (post-launch) implementations
 * must satisfy this contract. Callers depend on the interface only —
 * never import a specific provider directly. Swap providers via the
 * factory in index.ts + a single env var.
 */

import type { TemplateName } from './templates'

/**
 * Normalised message status across providers.
 * Termii and Meta use different raw status strings — the provider
 * implementation is responsible for mapping to this union.
 */
export type MessageStatus =
  | 'queued'      // accepted by provider, not yet sent
  | 'sent'        // sent to recipient's network
  | 'delivered'   // delivered to recipient's device
  | 'read'        // recipient opened the message (WhatsApp only)
  | 'failed'      // rejected or failed permanently

/**
 * Result of a send attempt.
 * Providers return this instead of throwing — callers decide how to
 * handle failures (retry, fallback to SMS, log, etc.).
 */
export interface SendResult {
  success: boolean
  messageId?: string         // provider-assigned ID for status lookup
  error?: string             // human-readable error if success=false
  providerRaw?: unknown      // raw provider response (for debugging)
}

/**
 * Status lookup result.
 */
export interface StatusResult {
  messageId: string
  status: MessageStatus
  timestamp: Date
  providerRaw?: unknown
}

/**
 * The contract every provider must implement.
 */
export interface WhatsAppProvider {
  /** Identifier for logging and debugging. */
  readonly name: 'termii' | 'meta'

  /**
   * Send a pre-approved template message.
   * @param to     Recipient number in E.164 format (e.g. +2348012345678)
   * @param templateName  Must exist in TEMPLATES registry
   * @param variables     Key-value map matching the template's variable names
   */
  sendTemplate(params: {
    to: string
    templateName: TemplateName
    variables: Record<string, string | number>
  }): Promise<SendResult>

  /**
   * Look up current status of a previously sent message.
   */
  getStatus(messageId: string): Promise<StatusResult>

  /**
   * Check wallet balance (Termii only — Meta uses postpaid billing).
   * Optional because Meta does not expose this.
   */
  getBalance?(): Promise<{ balance: number; currency: string }>
}