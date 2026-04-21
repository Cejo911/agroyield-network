/**
 * Slack webhook alert utility.
 *
 * Usage:
 *   import { slackAlert } from '@/lib/slack'
 *   slackAlert({ ... }).catch(() => {})   // always fire-and-forget
 *
 * Gracefully no-ops when the relevant webhook env var is not set
 * (local dev, or an unconfigured channel in prod).
 *
 * Channel routing
 * ---------------
 * We ship two webhook destinations:
 *
 *   • 'default'     → SLACK_WEBHOOK_URL (legacy; all existing callers)
 *   • 'beta-alerts' → SLACK_BETA_ALERTS_WEBHOOK_URL (Unicorn Sprint H1.2)
 *
 * Existing callers don't pass `channel` and keep hitting
 * SLACK_WEBHOOK_URL — routes like marketplace-order updates, payment
 * confirmations, and support tickets stay where they are. High-priority
 * operational alerts (uptime down, Termii webhook failures, cron_runs
 * errors) route to 'beta-alerts' so we can keep that channel
 * high-signal. Falling back silently to default when the beta-alerts
 * webhook isn't set would defeat the point — if the wire-up is missing
 * in prod we want those alerts to surface in logs rather than get
 * absorbed into the noisy default channel.
 */

type AlertLevel = 'info' | 'warning' | 'error'
type AlertChannel = 'default' | 'beta-alerts'

interface SlackAlertOptions {
  /** Short title — shows in bold */
  title: string
  /** Alert level — determines color bar (green/amber/red) */
  level?: AlertLevel
  /** Key-value fields displayed in the message */
  fields?: Record<string, string | number | boolean>
  /** Optional longer description */
  description?: string
  /**
   * Destination channel. 'default' goes to SLACK_WEBHOOK_URL (legacy
   * channel). 'beta-alerts' goes to SLACK_BETA_ALERTS_WEBHOOK_URL — use
   * it for uptime/Sentry/Termii/cron error signals that the on-call
   * rotation watches during the Beta launch window.
   */
  channel?: AlertChannel
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
  const channel = opts.channel ?? 'default'
  const webhookUrl =
    channel === 'beta-alerts'
      ? process.env.SLACK_BETA_ALERTS_WEBHOOK_URL
      : process.env.SLACK_WEBHOOK_URL

  if (!webhookUrl) {
    // No-op in dev. In prod, a missing beta-alerts webhook is an
    // operational gap we want visible in logs — don't silently absorb.
    if (channel === 'beta-alerts' && process.env.NODE_ENV === 'production') {
      console.error('[slack] SLACK_BETA_ALERTS_WEBHOOK_URL not set — alert dropped:', opts.title)
    }
    return
  }

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
