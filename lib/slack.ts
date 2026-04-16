/**
 * Slack webhook alert utility.
 *
 * Usage:
 *   import { slackAlert } from '@/lib/slack'
 *   slackAlert({ ... }).catch(() => {})   // always fire-and-forget
 *
 * Gracefully no-ops when SLACK_WEBHOOK_URL is not set (local dev).
 */

type AlertLevel = 'info' | 'warning' | 'error'

interface SlackAlertOptions {
  /** Short title — shows in bold */
  title: string
  /** Alert level — determines color bar (green/amber/red) */
  level?: AlertLevel
  /** Key-value fields displayed in the message */
  fields?: Record<string, string | number | boolean>
  /** Optional longer description */
  description?: string
}

const COLORS: Record<AlertLevel, string> = {
  info:    '#22c55e', // green
  warning: '#f59e0b', // amber
  error:   '#ef4444', // red
}

const EMOJIS: Record<AlertLevel, string> = {
  info:    '✅',
  warning: '⚠️',
  error:   '🚨',
}

export async function slackAlert(opts: SlackAlertOptions): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) return // No-op in dev or when not configured

  const level = opts.level ?? 'info'

  const fieldLines = opts.fields
    ? Object.entries(opts.fields)
        .map(([k, v]) => `*${k}:* ${v}`)
        .join('\n')
    : ''

  const payload = {
    attachments: [
      {
        color: COLORS[level],
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `${EMOJIS[level]} *${opts.title}*${opts.description ? `\n${opts.description}` : ''}`,
            },
          },
          ...(fieldLines
            ? [
                {
                  type: 'section',
                  text: { type: 'mrkdwn', text: fieldLines },
                },
              ]
            : []),
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `AgroYield Network · ${new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}`,
              },
            ],
          },
        ],
      },
    ],
  }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    console.error('[slack] Webhook failed:', res.status, await res.text())
  }
}
