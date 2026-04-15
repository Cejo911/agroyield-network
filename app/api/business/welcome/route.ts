/**
 * POST /api/business/welcome
 *
 * Fires after a new business is created. Sends:
 * 1. An in-app notification welcoming the user to the Business Suite
 * 2. A rich HTML email with platform usage insights and a nudge to complete their business profile
 *
 * Fire-and-forget from the client — never blocks the main flow.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/notifications'
import { getResend } from '@/lib/email/client'
import { SENDERS } from '@/lib/email/senders'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://agroyield.africa'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId, businessName } = await request.json() as {
      businessId: string
      businessName: string
    }

    if (!businessId || !businessName) {
      return NextResponse.json({ error: 'businessId and businessName are required' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()

    // Fetch user profile for personalisation
    const { data: profile } = await (admin as any)
      .from('profiles')
      .select('first_name, email')
      .eq('id', user.id)
      .single()

    const firstName = profile?.first_name || 'there'
    const email = profile?.email || user.email

    // ── 1. In-app notification ──
    await createNotification(admin, {
      userId: user.id,
      type: 'business_welcome',
      title: `Welcome to the Business Suite! "${businessName}" is ready.`,
      body: 'Complete your business profile — add logo, bank details, and CAC number to unlock professional invoices.',
      link: '/business/setup',
    })

    // ── 2. Welcome email ──
    if (email) {
      try {
        await getResend().emails.send({
          from: SENDERS.hello,
          to: email,
          subject: `Your business "${businessName}" is live on AgroYield!`,
          html: buildWelcomeEmail(firstName, businessName),
        })
      } catch (emailErr) {
        // Never let email failure affect the response
        console.error('[business/welcome] Email send failed:', emailErr)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    console.error('[business/welcome] Error:', err)
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function buildWelcomeEmail(firstName: string, businessName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#16a34a,#15803d);padding:32px;text-align:center;">
              <img src="${BASE_URL}/logo-horizontal-white.png" alt="AgroYield Network" style="height:60px;width:auto;" />
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h1 style="margin:0 0 8px;font-size:22px;color:#111827;">
                Welcome to the Business Suite, ${firstName}!
              </h1>
              <p style="margin:0 0 24px;font-size:16px;color:#374151;line-height:1.6;">
                <strong>&ldquo;${businessName}&rdquo;</strong> has been created successfully. You now have access to a complete toolkit for running your agribusiness — all in one place.
              </p>

              <!-- What you can do -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:24px;">
                    <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#166534;">Here&rsquo;s what you can do right away:</p>
                    <table cellpadding="0" cellspacing="0" style="font-size:14px;color:#166534;line-height:1.8;">
                      <tr><td style="padding:2px 0;">&#x2714;&#xFE0F;&nbsp; Create professional invoices and receipts</td></tr>
                      <tr><td style="padding:2px 0;">&#x2714;&#xFE0F;&nbsp; Manage your product catalogue with stock tracking</td></tr>
                      <tr><td style="padding:2px 0;">&#x2714;&#xFE0F;&nbsp; Track your customers and generate statements</td></tr>
                      <tr><td style="padding:2px 0;">&#x2714;&#xFE0F;&nbsp; Record expenses and monitor cash flow</td></tr>
                      <tr><td style="padding:2px 0;">&#x2714;&#xFE0F;&nbsp; View financial reports (P&amp;L, inventory, top customers)</td></tr>
                      <tr><td style="padding:2px 0;">&#x2714;&#xFE0F;&nbsp; Invite team members — accountants, staff, partners</td></tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Complete your profile nudge -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:24px;">
                    <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#92400e;">
                      &#x26A0;&#xFE0F; Complete your business profile
                    </p>
                    <p style="margin:0;font-size:14px;color:#a16207;line-height:1.6;">
                      Your invoices and receipts will look more professional when you add your:
                    </p>
                    <table cellpadding="0" cellspacing="0" style="font-size:14px;color:#a16207;line-height:1.8;margin-top:8px;">
                      <tr><td style="padding:2px 0;"><strong>Business logo</strong> — appears on all invoices</td></tr>
                      <tr><td style="padding:2px 0;"><strong>Bank details</strong> — so customers know where to pay</td></tr>
                      <tr><td style="padding:2px 0;"><strong>CAC number &amp; TIN</strong> — builds trust and credibility</td></tr>
                      <tr><td style="padding:2px 0;"><strong>WhatsApp number</strong> — customers can reach you instantly</td></tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.6;">
                The more complete your profile, the more professional your invoices appear — and the more trust you build with your customers.
              </p>

              <!-- CTA buttons -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
                <tr>
                  <td style="background:#16a34a;border-radius:10px;padding:0;margin-right:12px;">
                    <a href="${BASE_URL}/business/setup"
                      style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
                      Complete Business Profile &rarr;
                    </a>
                  </td>
                  <td style="width:12px;"></td>
                  <td style="background:#f3f4f6;border-radius:10px;padding:0;">
                    <a href="${BASE_URL}/business"
                      style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#374151;text-decoration:none;">
                      Go to Dashboard
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Pro tip -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;margin-top:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#1e40af;text-transform:uppercase;letter-spacing:0.5px;">Pro tip</p>
                    <p style="margin:0;font-size:14px;color:#1d4ed8;line-height:1.6;">
                      Create your first invoice within 5 minutes! Go to <strong>Invoices &rarr; New Invoice</strong>, add your customer and line items, and hit Send. Your customer gets a professional PDF by email or WhatsApp.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
                Questions? Reply to this email or reach out at
                <a href="mailto:hello@agroyield.africa" style="color:#16a34a;text-decoration:none;">hello@agroyield.africa</a>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                &copy; ${new Date().getFullYear()} AgroYield Network &middot; Nigeria's Agricultural Professional Community
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;">
                You're receiving this because you just created a business on agroyield.africa
              </p>
              <p style="margin:6px 0 0;font-size:10px;color:#c0c4ca;">An Agcoms International Project</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
