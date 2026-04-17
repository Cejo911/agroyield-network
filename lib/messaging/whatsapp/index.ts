/**
 * WhatsApp messaging — public entry point.
 *
 * The rest of the app imports from here ONLY:
 *   import { getWhatsAppProvider } from '@/lib/messaging/whatsapp'
 *
 * Never import termii-provider or meta-provider directly.
 * Provider selection is controlled by the WHATSAPP_PROVIDER env var.
 */

import type { WhatsAppProvider } from './provider'
import { TermiiProvider } from './termii-provider'
import { MetaProvider } from './meta-provider'

// Re-export types and helpers for callers
export type {
  WhatsAppProvider,
  SendResult,
  StatusResult,
  MessageStatus,
} from './provider'
export type { TemplateName } from './templates'
export { TEMPLATES } from './templates'

type ProviderName = 'termii' | 'meta'

/**
 * Singleton cache. Providers read env vars at construction time,
 * so instantiating once per process avoids redundant validation.
 */
let cached: WhatsAppProvider | null = null

/**
 * Returns the configured WhatsApp provider instance.
 * Reads WHATSAPP_PROVIDER env var; defaults to 'termii'.
 */
export function getWhatsAppProvider(): WhatsAppProvider {
  if (cached) return cached

  const selected = (process.env.WHATSAPP_PROVIDER || 'termii') as ProviderName

  cached = createProvider(selected)
  return cached
}

function createProvider(name: ProviderName): WhatsAppProvider {
  switch (name) {
    case 'termii':
      return new TermiiProvider()
    case 'meta':
      return new MetaProvider()
    default:
      throw new Error(
        `Unknown WHATSAPP_PROVIDER: "${name}". ` +
        `Must be "termii" or "meta".`
      )
  }
}

/**
 * Test-only: reset the singleton cache.
 * Useful when unit tests need to simulate env var changes.
 * Do NOT call from production code.
 */
export function __resetProviderCache(): void {
  cached = null
}