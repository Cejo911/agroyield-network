import { NextResponse } from 'next/server'
import { SENDERS } from '@/lib/email/senders'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

const APP_URL = 'https://agroyield.africa'
const FROM_EMAIL = SENDERS.digest

interface Opportunity {
  id: string
  title: string
  organization: string | null
  deadline: string | null
  category: string | null
}

interface NewMember {
  id: string
  first_name: string | null
  last_name: string | null
  role: string | null
  institution: string | null
}

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
  } catch (_err) {
    return false
  }
}

function buildDigestHtml(params: {
  firstName: string
  newOpportunities: Opportunity[]
  newMembers: NewMember[]
  weekOf: string
  totalMembers: number
}): string {
  const { firstName, newOpportunities, newMembers, weekOf, totalMembers } = params

  const oppsRows =
    newOpportunities.length > 0
      ? newOpportunities
          .slice(0, 6)
          .map(
            opp => `
          <tr>
            <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;">
              <a href="${APP_URL}/opportunities/${opp.id}"
                 style="color:#16a34a;font-weight:600;text-decoration:none;font-size:15px;display:block;"
              >${opp.title}</a>
              <span style="color:#6b7280;font-size:13px;">
                ${opp.organization ?? ''}${opp.category ? ` &middot; ${opp.category}` : ''}
              </span>
              ${
                opp.deadline
                  ? `<br><span style="color:#9ca3af;font-size:12px;">Deadline: ${new Date(
                      opp.deadline
                    ).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>`
                  : ''
              }
            </td>
          </tr>`
          )
          .join('')
      : `<tr><td style="padding:16px 0;color:#6b7280;font-size:14px;">
           No new opportunities this week &mdash;
           <a href="${APP_URL}/opportunities" style="color:#16a34a;">browse all opportunities</a>.
         </td></tr>`

  const membersRows =
    newMembers.length > 0
      ? newMembers
          .slice(0, 5)
          .map(
            m => `
          <tr>
            <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;">
              <a href="${APP_URL}/directory/${m.id}"
                 style="color:#16a34a;font-weight:600;text-decoration:none;font-size:15px;"
              >${m.first_name ?? ''} ${m.last_name ?? ''}</a>
              <br>
              <span style="color:#6b7280;font-size:13px;">
                ${m.role ?? ''}${m.institution ? ` &middot; ${m.institution}` : ''}
              </span>
            </td>
          </tr>`
          )
          .join('')
      : `<tr><td style="padding:16px 0;color:#6b7280;font-size:14px;">No new members joined this week.</td></tr>`

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
                Good morning, ${firstName}! &#128075;
              </p>
              <p style="margin:8px 0 0;color:#6b7280;font-size:15px;line-height:1.6;">
                Here&apos;s what&apos;s new on Nigeria&apos;s agricultural professional network this week.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#f0fdf4;border-radius:8px;overflow:hidden;">
                <tr>
                  <td style="padding:16px 20px;text-align:center;border-right:1px solid #d1fae5;">
                    <div style="font-size:24px;font-weight:700;color:#16a34a;">${newOpportunities.length}</div>
                    <div style="font-size:12px;color:#6b7280;margin-top:2px;">New Opportunities</div>
                  </td>
                  <td style="padding:16px 20px;text-align:center;border-right:1px solid #d1fae5;">
                    <div style="font-size:24px;font-weight:700;color:#16a34a;">${newMembers.length}</div>
                    <div style="font-size:12px;color:#6b7280;margin-top:2px;">New Members</div>
                  </td>
                  <td style="padding:16px 20px;text-align:center;">
                    <div style="font-size:24px;font-weight:700;color:#16a34a;">${totalMembers.toLocaleString()}</div>
                    <div style="font-size:12px;color:#6b7280;margin-top:2px;">Total Members</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 32px 0;">
              <h2 style="margin:0 0 4px;font-size:16px;font-weight:700;color:#111827;">
                &#127919; New Opportunities This Week
              </h2>
              <p style="margin:0 0 16px;color:#9ca3af;font-size:13px;">
                Funding, internships, jobs, grants and more
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${oppsRows}
              </table>
              <div style="margin-top:16px;">
                <a href="${APP_URL}/opportunities"
                   style="color:#16a34a;font-size:14px;font-weight:600;text-decoration:none;">
                  View all opportunities &rarr;
                </a>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 32px 0;">
              <h2 style="margin:0 0 4px;font-size:16px;font-weight:700;color:#111827;">
                &#128101; New Members This Week
              </h2>
              <p style="margin:0 0 16px;color:#9ca3af;font-size:13px;">
                Students, researchers, farmers and agripreneurs who just joined
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${membersRows}
              </table>
              <div style="margin-top:16px;">
                <a href="${APP_URL}/directory"
                   style="color:#16a34a;font-size:14px;font-weight:600;text-decoration:none;">
                  Browse the full directory &rarr;
                </a>
              </div>
            </td>
          </tr>

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
                      Complete your profile so researchers, farmers and agripreneurs can find you
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
                  AgroYield Network &middot; Nigeria&apos;s Agricultural Professional Network
                </p>
                <p style="margin:0;color:#9ca3af;font-size:12px;">
                  You receive this because you are a member of AgroYield Network.<br>
                  <a href="${APP_URL}/profile" style="color:#9ca3af;">Manage email preferences</a>
                </p>
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

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }

  const supabaseAdmin = getSupabaseAdmin()

  // Check if digest is enabled (default: enabled)
  const { data: digestSetting } = await (supabaseAdmin as any)
    .from('settings').select('value').eq('key', 'digest_enabled').maybeSingle()
  if (digestSetting?.value === 'false') {
    return NextResponse.json({ skipped: true, reason: 'Weekly digest is disabled in admin settings' })
  }

  const since = new Date()
  since.setDate(since.getDate() - 7)
  const sinceISO = since.toISOString()

  const weekOf = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  // Fetch platform content and user list in parallel
  const [oppsResult, newMembersResult, totalResult, authResult] = await Promise.all([
    supabaseAdmin
      .from('opportunities')
      .select('id, title, organization, deadline, category')
      .gte('created_at', sinceISO)
      .order('created_at', { ascending: false })
      .limit(8),
    supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, role, institution')
      .gte('created_at', sinceISO)
      .not('role', 'is', null)
      .order('created_at', { ascending: false })
      .limit(8),
    supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .not('role', 'is', null),
    supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])

  const newOpportunities = (oppsResult.data ?? []) as Opportunity[]
  const newMembers = (newMembersResult.data ?? []) as NewMember[]
  const totalMembers = totalResult.count ?? 0

  if (authResult.error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }

  // Build a name lookup map from profiles
  const { data: profileNames } = await supabaseAdmin
    .from('profiles')
    .select('id, first_name')
    .not('first_name', 'is', null)

  const nameMap = new Map<string, string>(
    (profileNames ?? []).map((p: { id: string; first_name: string | null }) => [
      p.id,
      p.first_name as string,
    ])
  )

  let sent = 0
  let failed = 0
  let skipped = 0

  for (const user of authResult.data.users) {
    if (!user.email) {
      skipped++
      continue
    }

    const firstName = nameMap.get(user.id)
    if (!firstName) {
      skipped++
      continue
    }

    const membersExcludingSelf = newMembers.filter(m => m.id !== user.id)

    const ok = await sendEmail(
      user.email,
      `\uD83C\uDF31 Your AgroYield Weekly Digest \u2013 ${weekOf}`,
      buildDigestHtml({ firstName, newOpportunities, newMembers: membersExcludingSelf, weekOf, totalMembers })
    )

    if (ok) sent++
    else failed++

    // Respect Resend rate limits (100 emails/sec on free plan)
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  return NextResponse.json({ success: true, sent, failed, skipped, weekOf })
}
