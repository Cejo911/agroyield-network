/**
 * Weekly Digest — Unicorn #1.
 *
 * Schedule: Mondays 07:00 Africa/Lagos (06:00 UTC) — set in vercel.json.
 *
 * For each active member, personalises:
 *   1. Top 3 price swings (week-over-week) in their state
 *   2. Matched opportunities + grants (any-tag intersection with profile.interests)
 *   3. Unread messages count from the messaging module
 *   4. One business insight (revenue swing or collection-rate delta)
 *
 * Graceful fallbacks when interests / location are empty.
 *
 * Gating:
 *   - CRON_SECRET (via runCron harness)
 *   - settings.digest_enabled — global kill switch (admin UI)
 *
 * Idempotent per ISO week (weeklyKey).
 */

import { runCron, weeklyKey } from '@/lib/cron'
import { SENDERS } from '@/lib/email/senders'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

const APP_URL = 'https://agroyield.africa'
const FROM_EMAIL = SENDERS.digest

// ── Types ────────────────────────────────────────────────────────────────────

interface Opportunity {
  id: string
  title: string
  type: string | null
  organisation: string | null
  deadline: string | null
  description: string | null
}

interface Grant {
  id: string
  title: string
  funder: string
  category: string
  deadline: string | null
  amount_min: number | null
  amount_max: number | null
  currency: string | null
  apply_link: string | null
}

interface PriceRow {
  commodity: string
  state: string | null
  price: number
  unit: string
  reported_at: string
  is_active: boolean | null
}

interface ConversationRow {
  id: string
  participant_a: string
  participant_b: string
}

interface UnreadMessageRow {
  conversation_id: string
  sender_id: string
}

interface ProfileRow {
  id: string
  first_name: string | null
  role: string | null
  location: string | null
  interests: string[] | null
}

interface BusinessRow {
  id: string
  user_id: string
  name: string
}

interface InvoiceRow {
  business_id: string
  status: string | null
  total: number | string | null
  issue_date: string | null
  paid_at: string | null
}

interface PriceSwing {
  commodity: string
  unit: string
  avgThis: number
  avgLast: number
  pctChange: number
}

interface MatchedItem {
  kind: 'opportunity' | 'grant'
  id: string
  title: string
  subtitle: string
  deadline: string | null
}

interface BusinessInsight {
  headline: string
  detail: string
  tone: 'up' | 'down' | 'neutral'
}

// ── Email send ───────────────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    })
    return res.ok
  } catch {
    return false
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtNaira(n: number): string {
  return '₦' + Math.round(n).toLocaleString('en-NG')
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c] as string))
}

/**
 * Compute top 3 price swings for a state.
 * Week-over-week: avg(last 7d) vs avg(prior 7d), same commodity.
 * Requires ≥2 samples in each window for a commodity to be eligible.
 */
function computeSwings(rows: PriceRow[], state: string | null, now: Date): PriceSwing[] {
  if (!state) return []
  const sevenDays = 7 * 24 * 60 * 60 * 1000
  const weekStart = now.getTime() - sevenDays
  const priorWeekStart = weekStart - sevenDays

  // Bucket: commodity → { thisWeek:[prices], lastWeek:[prices], unit }
  const buckets = new Map<string, { this: number[]; last: number[]; unit: string }>()

  for (const r of rows) {
    if (r.is_active === false) continue
    if (!r.state || r.state.toLowerCase() !== state.toLowerCase()) continue
    const t = new Date(r.reported_at).getTime()
    const key = r.commodity.toLowerCase()
    if (!buckets.has(key)) buckets.set(key, { this: [], last: [], unit: r.unit })
    const b = buckets.get(key)!
    if (t >= weekStart) b.this.push(Number(r.price))
    else if (t >= priorWeekStart) b.last.push(Number(r.price))
  }

  const swings: PriceSwing[] = []
  for (const [commodity, b] of buckets) {
    if (b.this.length < 2 || b.last.length < 2) continue
    const avgThis = b.this.reduce((s, x) => s + x, 0) / b.this.length
    const avgLast = b.last.reduce((s, x) => s + x, 0) / b.last.length
    if (avgLast === 0) continue
    const pct = ((avgThis - avgLast) / avgLast) * 100
    if (Math.abs(pct) < 2) continue // ignore noise below 2%
    swings.push({
      commodity: commodity[0].toUpperCase() + commodity.slice(1),
      unit: b.unit,
      avgThis,
      avgLast,
      pctChange: pct,
    })
  }

  // Sort by absolute swing desc, top 3
  return swings
    .sort((a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange))
    .slice(0, 3)
}

/**
 * Match opportunities and grants to a user's interests.
 * Any-tag match: keyword intersection between interests and title/type/category/description.
 * If interests empty → return latest 3 opps + latest 2 grants as a fallback.
 */
function computeMatches(
  opportunities: Opportunity[],
  grants: Grant[],
  interests: string[] | null,
  maxOpps = 3,
  maxGrants = 2,
): { matches: MatchedItem[]; usedFallback: boolean } {
  const hasInterests = Array.isArray(interests) && interests.length > 0
  const tokens = hasInterests
    ? (interests as string[]).flatMap((i) => i.toLowerCase().split(/\s+/)).filter(Boolean)
    : []

  const tokensRegex = tokens.length
    ? new RegExp(`\\b(${tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'i')
    : null

  const matchOpp = (o: Opportunity): boolean => {
    if (!tokensRegex) return true
    const hay = [o.title, o.type ?? '', o.organisation ?? '', o.description ?? ''].join(' ')
    return tokensRegex.test(hay)
  }

  const matchGrant = (g: Grant): boolean => {
    if (!tokensRegex) return true
    const hay = [g.title, g.category, g.funder].join(' ')
    return tokensRegex.test(hay)
  }

  const oppsMatched = opportunities.filter(matchOpp).slice(0, maxOpps)
  const grantsMatched = grants.filter(matchGrant).slice(0, maxGrants)

  const matches: MatchedItem[] = [
    ...oppsMatched.map((o) => ({
      kind: 'opportunity' as const,
      id: o.id,
      title: o.title,
      subtitle: [o.organisation, o.type].filter(Boolean).join(' · ') || 'New opportunity',
      deadline: o.deadline,
    })),
    ...grantsMatched.map((g) => {
      const amount = g.amount_max
        ? `up to ${g.currency || 'NGN'} ${Number(g.amount_max).toLocaleString()}`
        : g.amount_min
        ? `from ${g.currency || 'NGN'} ${Number(g.amount_min).toLocaleString()}`
        : g.funder
      return {
        kind: 'grant' as const,
        id: g.id,
        title: g.title,
        subtitle: `${g.category} · ${amount}`,
        deadline: g.deadline,
      }
    }),
  ]

  return { matches, usedFallback: !hasInterests }
}

/**
 * Pick ONE insight for a user's primary business.
 * Compares (a) revenue paid this-week vs last-week and (b) collection rate this-month vs last-month.
 * Returns the one with the bigger absolute delta. Null if no business or no data.
 */
function computeBusinessInsight(
  business: BusinessRow | undefined,
  invoices: InvoiceRow[],
  now: Date,
): BusinessInsight | null {
  if (!business) return null

  const bizInvoices = invoices.filter((i) => i.business_id === business.id)
  if (bizInvoices.length === 0) return null

  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  const thisMonth = now.getMonth()
  const lastMonth = new Date(now.getFullYear(), thisMonth - 1, 1)

  // (a) Revenue paid this-week vs last-week
  let paidThisWeek = 0
  let paidLastWeek = 0
  for (const inv of bizInvoices) {
    if (!inv.paid_at || inv.status !== 'paid') continue
    const paid = new Date(inv.paid_at)
    const total = Number(inv.total) || 0
    if (paid >= weekAgo) paidThisWeek += total
    else if (paid >= twoWeeksAgo) paidLastWeek += total
  }
  const revenueDelta =
    paidLastWeek > 0
      ? ((paidThisWeek - paidLastWeek) / paidLastWeek) * 100
      : paidThisWeek > 0
      ? 100
      : 0

  // (b) Collection rate this-month vs last-month
  const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`
  const nowKey = monthKey(now)
  const lastKey = monthKey(lastMonth)
  let issuedThis = 0
  let paidInvoicesThis = 0
  let issuedLast = 0
  let paidInvoicesLast = 0
  for (const inv of bizInvoices) {
    if (!inv.issue_date) continue
    const iss = new Date(inv.issue_date)
    const ik = monthKey(iss)
    const isPaid = inv.status === 'paid'
    if (ik === nowKey) {
      issuedThis++
      if (isPaid) paidInvoicesThis++
    } else if (ik === lastKey) {
      issuedLast++
      if (isPaid) paidInvoicesLast++
    }
  }
  const collThis = issuedThis > 0 ? (paidInvoicesThis / issuedThis) * 100 : 0
  const collLast = issuedLast > 0 ? (paidInvoicesLast / issuedLast) * 100 : 0
  const collDelta = collThis - collLast // percentage-point change

  // Pick insight with bigger magnitude
  if (Math.abs(revenueDelta) >= Math.abs(collDelta * 3) && paidThisWeek + paidLastWeek > 0) {
    // Weight collDelta by 3 because pct-points and pct-change scale differently
    const tone = revenueDelta > 0 ? 'up' : revenueDelta < 0 ? 'down' : 'neutral'
    const direction = revenueDelta > 0 ? 'up' : 'down'
    if (paidLastWeek === 0) {
      return {
        headline: `${fmtNaira(paidThisWeek)} collected this week`,
        detail: 'Your first week with paid invoices tracked — momentum starts here.',
        tone: 'up',
      }
    }
    return {
      headline: `Revenue ${direction} ${Math.abs(revenueDelta).toFixed(0)}% week-over-week`,
      detail: `${fmtNaira(paidThisWeek)} this week vs ${fmtNaira(paidLastWeek)} last week.`,
      tone,
    }
  }

  if (issuedThis === 0 && issuedLast === 0) return null

  if (issuedLast === 0 && issuedThis > 0) {
    return {
      headline: `${paidInvoicesThis}/${issuedThis} invoices collected this month`,
      detail: 'Keep following up on open invoices — every day of delay lowers collection odds.',
      tone: collThis >= 50 ? 'up' : 'neutral',
    }
  }

  const tone = collDelta > 2 ? 'up' : collDelta < -2 ? 'down' : 'neutral'
  return {
    headline: `Collection rate ${collDelta >= 0 ? '+' : ''}${collDelta.toFixed(0)} pts month-over-month`,
    detail: `${collThis.toFixed(0)}% of invoices paid this month vs ${collLast.toFixed(0)}% last month.`,
    tone,
  }
}

// ── HTML sections ────────────────────────────────────────────────────────────

function buildPriceSection(swings: PriceSwing[], state: string | null): string {
  if (swings.length === 0) {
    const stateLabel = state ? escapeHtml(state) : 'your state'
    return `
      <tr>
        <td style="padding:28px 32px 0;">
          <h2 style="margin:0 0 4px;font-size:16px;font-weight:700;color:#111827;">
            &#128200; Price Watch &middot; ${stateLabel}
          </h2>
          <p style="margin:0 0 12px;color:#9ca3af;font-size:13px;">
            ${state
              ? 'Not enough price reports from your state this week. Help the community &mdash; report one below.'
              : 'Add your location to your profile and we&rsquo;ll send price swings from your state each Monday.'}
          </p>
          <a href="${APP_URL}/${state ? 'prices' : 'profile'}"
             style="color:#16a34a;font-size:14px;font-weight:600;text-decoration:none;">
            ${state ? 'Report a price' : 'Update profile'} &rarr;
          </a>
        </td>
      </tr>`
  }

  const rows = swings
    .map((s) => {
      const arrow = s.pctChange >= 0 ? '&uarr;' : '&darr;'
      const color = s.pctChange >= 0 ? '#dc2626' : '#16a34a' // price up = red for buyers
      const bg    = s.pctChange >= 0 ? '#fef2f2' : '#f0fdf4'
      const pct   = `${s.pctChange >= 0 ? '+' : ''}${s.pctChange.toFixed(1)}%`
      return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td>
                  <div style="font-weight:600;color:#111827;font-size:15px;">${escapeHtml(s.commodity)}</div>
                  <div style="font-size:12px;color:#6b7280;">
                    ${fmtNaira(s.avgThis)}/${escapeHtml(s.unit)} &middot;
                    was ${fmtNaira(s.avgLast)}
                  </div>
                </td>
                <td align="right" style="white-space:nowrap;">
                  <span style="background:${bg};color:${color};font-size:13px;font-weight:600;
                        padding:4px 10px;border-radius:999px;">
                    ${arrow} ${pct}
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>`
    })
    .join('')

  return `
    <tr>
      <td style="padding:28px 32px 0;">
        <h2 style="margin:0 0 4px;font-size:16px;font-weight:700;color:#111827;">
          &#128200; Price Watch &middot; ${escapeHtml(state ?? '')}
        </h2>
        <p style="margin:0 0 12px;color:#9ca3af;font-size:13px;">
          Biggest week-over-week swings from price reports in your state
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          ${rows}
        </table>
        <div style="margin-top:12px;">
          <a href="${APP_URL}/prices"
             style="color:#16a34a;font-size:14px;font-weight:600;text-decoration:none;">
            Open the price dashboard &rarr;
          </a>
        </div>
      </td>
    </tr>`
}

function buildMatchesSection(matches: MatchedItem[], usedFallback: boolean): string {
  if (matches.length === 0) {
    return `
      <tr>
        <td style="padding:28px 32px 0;">
          <h2 style="margin:0 0 4px;font-size:16px;font-weight:700;color:#111827;">
            &#127919; Matched for You
          </h2>
          <p style="margin:0 0 12px;color:#9ca3af;font-size:13px;">
            No new opportunities or grants match your interests this week.
          </p>
          <a href="${APP_URL}/opportunities"
             style="color:#16a34a;font-size:14px;font-weight:600;text-decoration:none;">
            Browse all opportunities &rarr;
          </a>
        </td>
      </tr>`
  }

  const rows = matches
    .map((m) => {
      const badge = m.kind === 'grant'
        ? `<span style="background:#ecfccb;color:#4d7c0f;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;vertical-align:middle;">GRANT</span>`
        : `<span style="background:#dbeafe;color:#1d4ed8;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;vertical-align:middle;">OPPORTUNITY</span>`
      const url = m.kind === 'grant' ? `${APP_URL}/grants/${m.id}` : `${APP_URL}/opportunities/${m.id}`
      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;">
            <div style="margin-bottom:4px;">${badge}</div>
            <a href="${url}"
               style="color:#16a34a;font-weight:600;text-decoration:none;font-size:15px;display:block;"
            >${escapeHtml(m.title)}</a>
            <span style="color:#6b7280;font-size:13px;">${escapeHtml(m.subtitle)}</span>
            ${m.deadline ? `<br><span style="color:#9ca3af;font-size:12px;">Deadline: ${fmtDate(m.deadline)}</span>` : ''}
          </td>
        </tr>`
    })
    .join('')

  const heading = usedFallback ? 'Fresh This Week' : 'Matched for Your Interests'
  const blurb = usedFallback
    ? `Add interests to your profile and we&rsquo;ll tailor these to you.`
    : `Opportunities and grants filtered to the topics you follow.`

  return `
    <tr>
      <td style="padding:28px 32px 0;">
        <h2 style="margin:0 0 4px;font-size:16px;font-weight:700;color:#111827;">
          &#127919; ${heading}
        </h2>
        <p style="margin:0 0 16px;color:#9ca3af;font-size:13px;">${blurb}</p>
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          ${rows}
        </table>
        <div style="margin-top:14px;">
          <a href="${APP_URL}/${usedFallback ? 'profile' : 'opportunities'}"
             style="color:#16a34a;font-size:14px;font-weight:600;text-decoration:none;">
            ${usedFallback ? 'Add your interests' : 'View all opportunities'} &rarr;
          </a>
        </div>
      </td>
    </tr>`
}

function buildUnreadSection(count: number): string {
  if (count === 0) return ''
  const label = count === 1 ? '1 unread message' : `${count} unread messages`
  return `
    <tr>
      <td style="padding:28px 32px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
          style="background:#fffbeb;border-left:4px solid #f59e0b;border-radius:6px;">
          <tr>
            <td style="padding:14px 18px;">
              <div style="font-weight:600;color:#92400e;font-size:14px;">
                &#9993;&#65039; ${label}
              </div>
              <div style="color:#78350f;font-size:13px;margin-top:2px;">
                Someone is waiting to hear back from you.
              </div>
              <a href="${APP_URL}/messages"
                 style="display:inline-block;margin-top:8px;color:#b45309;font-weight:600;
                        font-size:13px;text-decoration:none;">
                Open messages &rarr;
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
}

function buildBusinessSection(insight: BusinessInsight | null, businessName: string | null): string {
  if (!insight) return ''
  const bgMap = { up: '#f0fdf4', down: '#fef2f2', neutral: '#f9fafb' }
  const borderMap = { up: '#16a34a', down: '#dc2626', neutral: '#9ca3af' }
  const emojiMap = { up: '&#128200;', down: '&#128201;', neutral: '&#128181;' }
  const bg = bgMap[insight.tone]
  const border = borderMap[insight.tone]
  const emoji = emojiMap[insight.tone]

  return `
    <tr>
      <td style="padding:28px 32px 0;">
        <h2 style="margin:0 0 4px;font-size:16px;font-weight:700;color:#111827;">
          ${emoji} Your Business Pulse${businessName ? ` &middot; ${escapeHtml(businessName)}` : ''}
        </h2>
        <p style="margin:0 0 12px;color:#9ca3af;font-size:13px;">
          One number worth your attention this week
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
          style="background:${bg};border-left:4px solid ${border};border-radius:6px;">
          <tr>
            <td style="padding:16px 20px;">
              <div style="font-weight:700;color:#111827;font-size:16px;">
                ${insight.headline}
              </div>
              <div style="color:#4b5563;font-size:13px;margin-top:4px;">
                ${insight.detail}
              </div>
              <a href="${APP_URL}/business"
                 style="display:inline-block;margin-top:10px;color:#16a34a;font-weight:600;
                        font-size:13px;text-decoration:none;">
                Open business dashboard &rarr;
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
}

// ── Full email template ──────────────────────────────────────────────────────

function buildDigestHtml(params: {
  firstName: string
  sections: {
    priceSwings: PriceSwing[]
    state: string | null
    matches: MatchedItem[]
    usedFallback: boolean
    unreadCount: number
    insight: BusinessInsight | null
    businessName: string | null
  }
  weekOf: string
  totalMembers: number
}): string {
  const { firstName, sections, weekOf, totalMembers } = params
  const statMatches = sections.matches.length
  const statSwings = sections.priceSwings.length
  const statUnread = sections.unreadCount

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your AgroYield Weekly Digest</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background-color:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
          style="max-width:580px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

          <tr>
            <td style="background:#16a34a;padding:28px 32px;text-align:center;">
              <img src="https://agroyield.africa/logo-horizontal-white.png" alt="AgroYield Network" style="height:70px;width:auto;" />
              <div style="color:#bbf7d0;font-size:13px;margin-top:6px;">
                Weekly Digest &middot; ${weekOf}
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:32px 32px 0;">
              <p style="margin:0;font-size:18px;font-weight:600;color:#111827;">
                Good morning, ${escapeHtml(firstName)}! &#128075;
              </p>
              <p style="margin:8px 0 0;color:#6b7280;font-size:15px;line-height:1.6;">
                Here&rsquo;s what the network turned up for you this week.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#f0fdf4;border-radius:8px;overflow:hidden;">
                <tr>
                  <td style="padding:16px 12px;text-align:center;border-right:1px solid #d1fae5;">
                    <div style="font-size:22px;font-weight:700;color:#16a34a;">${statSwings}</div>
                    <div style="font-size:11px;color:#6b7280;margin-top:2px;">Price swings</div>
                  </td>
                  <td style="padding:16px 12px;text-align:center;border-right:1px solid #d1fae5;">
                    <div style="font-size:22px;font-weight:700;color:#16a34a;">${statMatches}</div>
                    <div style="font-size:11px;color:#6b7280;margin-top:2px;">Matched for you</div>
                  </td>
                  <td style="padding:16px 12px;text-align:center;border-right:1px solid #d1fae5;">
                    <div style="font-size:22px;font-weight:700;color:#16a34a;">${statUnread}</div>
                    <div style="font-size:11px;color:#6b7280;margin-top:2px;">Unread msgs</div>
                  </td>
                  <td style="padding:16px 12px;text-align:center;">
                    <div style="font-size:22px;font-weight:700;color:#16a34a;">${totalMembers.toLocaleString()}</div>
                    <div style="font-size:11px;color:#6b7280;margin-top:2px;">Network</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${buildPriceSection(sections.priceSwings, sections.state)}
          ${buildMatchesSection(sections.matches, sections.usedFallback)}
          ${buildUnreadSection(sections.unreadCount)}
          ${buildBusinessSection(sections.insight, sections.businessName)}

          <tr>
            <td style="padding:32px;">
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#f0fdf4;border-radius:8px;border:1px solid #d1fae5;">
                <tr>
                  <td style="padding:24px;text-align:center;">
                    <p style="margin:0 0 4px;color:#166534;font-size:15px;font-weight:600;">
                      Make the most of AgroYield Network
                    </p>
                    <p style="margin:0 0 16px;color:#4b7a56;font-size:13px;">
                      Keep your profile, interests and state up to date so we can keep this digest useful
                    </p>
                    <a href="${APP_URL}/profile"
                       style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;
                              padding:10px 28px;border-radius:6px;font-weight:600;font-size:14px;">
                      Update My Profile
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 32px;text-align:center;">
              <div style="border-top:1px solid #f3f4f6;padding-top:24px;">
                <p style="margin:0 0 4px;color:#9ca3af;font-size:12px;">
                  AgroYield Network &middot; Nigeria&rsquo;s Agricultural Professional Network
                </p>
                <p style="margin:0;color:#9ca3af;font-size:12px;">
                  You receive this because you are a member of AgroYield Network.<br>
                  <a href="${APP_URL}/profile" style="color:#9ca3af;">Manage email preferences</a>
                </p>
                <p style="margin:6px 0 0;color:#c0c4ca;font-size:10px;">An Agcoms International Project</p>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ── Cron handler ─────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  return runCron(request, {
    jobName: 'weekly_digest',
    idempotencyKey: weeklyKey(),
    handler: async () => {
      if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY not configured')
      }

      const admin = getSupabaseAdmin()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const adminAny = admin as any

      // ── Kill switch (admin UI) ──
      const { data: digestSetting } = await adminAny
        .from('settings').select('value').eq('key', 'digest_enabled').maybeSingle()
      if (digestSetting?.value === 'false') {
        return {
          processedCount: 0,
          metadata: { skipped_reason: 'Weekly digest disabled in admin settings' },
        }
      }

      const now = new Date()
      const weekOf = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString()

      // ── Bulk pre-fetch: six parallel queries ──
      const [
        profilesRes, opportunitiesRes, grantsRes, pricesRes,
        conversationsRes, unreadRes, businessesRes, invoicesRes, totalRes, authRes,
      ] = await Promise.all([
        adminAny.from('profiles')
          .select('id, first_name, role, location, interests')
          .not('role', 'is', null),
        adminAny.from('opportunities')
          .select('id, title, type, organisation, deadline, description')
          .eq('is_active', true)
          .eq('is_pending_review', false)
          .gte('created_at', fourteenDaysAgo)
          .order('created_at', { ascending: false })
          .limit(60),
        adminAny.from('grants')
          .select('id, title, funder, category, deadline, amount_min, amount_max, currency, apply_link, status, created_at')
          .eq('status', 'open')
          .gte('created_at', fourteenDaysAgo)
          .order('created_at', { ascending: false })
          .limit(40),
        adminAny.from('price_reports')
          .select('commodity, state, price, unit, reported_at, is_active')
          .gte('reported_at', fourteenDaysAgo)
          .limit(5000),
        adminAny.from('conversations')
          .select('id, participant_a, participant_b'),
        adminAny.from('messages')
          .select('conversation_id, sender_id')
          .is('read_at', null)
          .gte('created_at', sixtyDaysAgo),
        adminAny.from('businesses')
          .select('id, user_id, name')
          .order('created_at', { ascending: true }),
        adminAny.from('invoices')
          .select('business_id, status, total, issue_date, paid_at')
          .gte('issue_date', sixtyDaysAgo.slice(0, 10)),
        adminAny.from('profiles')
          .select('*', { count: 'exact', head: true })
          .not('role', 'is', null),
        admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      ])

      if (authRes.error) throw new Error('Failed to fetch users')

      const profiles = (profilesRes.data ?? []) as ProfileRow[]
      const opportunities = (opportunitiesRes.data ?? []) as Opportunity[]
      const grants = (grantsRes.data ?? []) as Grant[]
      const prices = (pricesRes.data ?? []) as PriceRow[]
      const conversations = (conversationsRes.data ?? []) as ConversationRow[]
      const unreadMessages = (unreadRes.data ?? []) as UnreadMessageRow[]
      const businesses = (businessesRes.data ?? []) as BusinessRow[]
      const invoices = (invoicesRes.data ?? []) as InvoiceRow[]
      const totalMembers = totalRes.count ?? 0

      // Unused variable suppression (sevenDaysAgo reserved for future "new this week" slicing)
      void sevenDaysAgo

      // ── Build per-user index structures (single pass) ──
      const profileById = new Map<string, ProfileRow>()
      for (const p of profiles) profileById.set(p.id, p)

      const convByUser = new Map<string, ConversationRow[]>()
      for (const c of conversations) {
        const add = (uid: string) => {
          const arr = convByUser.get(uid) ?? []
          arr.push(c)
          convByUser.set(uid, arr)
        }
        add(c.participant_a)
        add(c.participant_b)
      }

      const convById = new Map<string, ConversationRow>()
      for (const c of conversations) convById.set(c.id, c)

      const unreadByRecipient = new Map<string, number>()
      for (const m of unreadMessages) {
        const c = convById.get(m.conversation_id)
        if (!c) continue
        const recipient = m.sender_id === c.participant_a ? c.participant_b : c.participant_a
        unreadByRecipient.set(recipient, (unreadByRecipient.get(recipient) ?? 0) + 1)
      }

      const primaryBizByUser = new Map<string, BusinessRow>()
      for (const b of businesses) {
        if (!primaryBizByUser.has(b.user_id)) primaryBizByUser.set(b.user_id, b) // first (oldest) wins
      }

      // ── Per-user send loop ──
      let sent = 0
      let failed = 0
      let skipped = 0

      for (const user of authRes.data.users) {
        if (!user.email) { skipped++; continue }
        const profile = profileById.get(user.id)
        if (!profile?.first_name) { skipped++; continue }

        // Build per-user personalised data
        const priceSwings = computeSwings(prices, profile.location, now)
        const { matches, usedFallback } = computeMatches(opportunities, grants, profile.interests)
        const unreadCount = unreadByRecipient.get(user.id) ?? 0
        const biz = primaryBizByUser.get(user.id)
        const insight = computeBusinessInsight(biz, invoices, now)

        const html = buildDigestHtml({
          firstName: profile.first_name,
          sections: {
            priceSwings,
            state: profile.location,
            matches,
            usedFallback,
            unreadCount,
            insight,
            businessName: biz?.name ?? null,
          },
          weekOf,
          totalMembers,
        })

        const ok = await sendEmail(
          user.email,
          `\uD83C\uDF31 Your AgroYield Weekly Digest \u2013 ${weekOf}`,
          html,
        )
        if (ok) sent++; else failed++

        // Resend free plan: ~100 emails/sec. 100ms keeps us well clear.
        await new Promise((r) => setTimeout(r, 100))
      }

      return {
        processedCount: authRes.data.users.length,
        successCount: sent,
        failureCount: failed,
        metadata: {
          skipped,
          weekOf,
          opportunities_in_pool: opportunities.length,
          grants_in_pool: grants.length,
          price_reports_in_pool: prices.length,
          businesses_with_invoices: new Set(invoices.map((i) => i.business_id)).size,
        },
      }
    },
  })
}
