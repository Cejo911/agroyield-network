// lib/email/senders.ts
// Single source of truth for all Resend sender addresses.
// Override via env vars in Vercel if you ever need to rotate sending domains.

const BRAND = 'AgroYield Network'

export const SENDERS = {
  noreply:  `${BRAND} <${process.env.RESEND_FROM_NOREPLY  ?? 'noreply@agroyield.africa'}>`,
  security: `${BRAND} <${process.env.RESEND_FROM_SECURITY ?? 'security@agroyield.africa'}>`,
  digest:   `${BRAND} <${process.env.RESEND_FROM_DIGEST   ?? 'digest@agroyield.africa'}>`,
  hello:    `${BRAND} <${process.env.RESEND_FROM_HELLO    ?? 'hello@agroyield.africa'}>`,
} as const

export const INBOXES = {
  hello:    process.env.CONTACT_INBOX  ?? 'hello@agroyield.africa',
  partners: 'partners@agroyield.africa',
  press:    'press@agroyield.africa',
} as const