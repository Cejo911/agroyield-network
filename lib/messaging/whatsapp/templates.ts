/**
 * Approved WhatsApp template definitions.
 *
 * Single source of truth for template names, variable order,
 * and metadata. Referenced by both the Termii and Meta providers.
 *
 * Rule: if a template changes in Meta Business Manager,
 * update this file in the SAME PR. Divergence causes silent
 * message failures at runtime.
 */

export type TemplateCategory = 'UTILITY' | 'MARKETING' | 'AUTHENTICATION'

export interface TemplateDefinition {
  readonly name: string
  readonly category: TemplateCategory
  readonly language: string
  readonly variables: readonly string[]
  readonly hasUrlButton: boolean
}

// Each entry mirrors what was approved in Termii + Meta.
// Variable order MUST match the order of {{1}}, {{2}}... in the body.
export const TEMPLATES = {
  invoice_send: {
    name: 'invoice_send',
    category: 'UTILITY',
    language: 'en',
    variables: [
      'customer_name',    // {{1}}
      'invoice_number',   // {{2}}
      'business_name',    // {{3}}
      'amount',           // {{4}}
      'due_date',         // {{5}}
      'invoice_slug',     // {{6}} — URL button
    ],
    hasUrlButton: true,
  },
  payment_reminder: {
    name: 'payment_reminder',
    category: 'UTILITY',
    language: 'en',
    variables: [
      'customer_name',    // {{1}}
      'invoice_number',   // {{2}}
      'amount',           // {{3}}
      'due_date',         // {{4}}
      'invoice_slug',     // {{5}} — URL button
    ],
    hasUrlButton: true,
  },
  weekly_digest: {
    name: 'weekly_digest',
    category: 'UTILITY',
    language: 'en',
    variables: [
      'customer_name',       // {{1}}
      'revenue',             // {{2}}
      'outstanding_count',   // {{3}}
      'new_customer_count',  // {{4}}
    ],
    hasUrlButton: false,
  },
} as const satisfies Record<string, TemplateDefinition>

export type TemplateName = keyof typeof TEMPLATES

/**
 * Build the positional variable array the WhatsApp APIs expect.
 * Guarantees the order matches the approved template body.
 */
export function buildVariables(
  templateName: TemplateName,
  values: Record<string, string | number>
): string[] {
  const template = TEMPLATES[templateName]
  return template.variables.map((varName) => {
    const value = values[varName]
    if (value === undefined || value === null || value === '') {
      throw new Error(
        `Missing variable "${varName}" for template "${templateName}"`
      )
    }
    return String(value)
  })
}

/**
 * Pre-flight validation — call this before sending.
 * Surfaces missing data at the caller, not deep inside the provider.
 */
export function validateTemplateInput(
  templateName: TemplateName,
  values: Record<string, unknown>
): void {
  const template = TEMPLATES[templateName]
  const missing = template.variables.filter(
    (v) => values[v] === undefined || values[v] === null || values[v] === ''
  )
  if (missing.length > 0) {
    throw new Error(
      `Template "${templateName}" requires: ${missing.join(', ')}`
    )
  }
}