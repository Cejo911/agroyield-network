import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Window: expires between 3 and 4 days from now — ensures exactly one email per member
  const now = new Date()
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
  const in4Days = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000)

  const { data: expiring, error } = await adminClient
    .from('profiles')
    .select('id, first_name, email, subscription_expires_at, subscription_plan')
    .eq('is_verified', true)
    .gte('subscription_expires_at', in3Days.toISOString())
    .lte('subscription_expires_at', in4Days.toISOString())

  if (error) {
    console.error('Expiry reminder query error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!expiring || expiring.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No expiring subscriptions today' })
  }

  let sent = 0
  let failed = 0

  for (const profile of expiring) {
    if (!profile.email) continue

    const expiryDate = new Date(profile.subscription_expires_at)
    const formattedDate = expiryDate.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    const planLabel = profile.subscription_plan
      ? profile.subscription_plan.charAt(0).toUpperCase() + profile.subscription_plan.slice(1)
      : null

    try {
      await resend.emails.send({
        from: 'AgroYield Network <noreply@agroyield.africa>',
        to: profile.email,
        subject: 'Your AgroYield verification expires in 3 days',
        html: `
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
            <td style="background:#16a34a;padding:32px;text-align:center;">
              <img src="https://agroyield.africa/logo-horizontal-white.png" alt="AgroYield Network" style="height:40px;width:auto;" />
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 16px;font-size:16px;color:#374151;">Hi ${profile.first_name ?? 'there'},</p>
              <p style="margin:0 0 24px;font-size:16px;color:#374151;line-height:1.6;">
                Your <strong>AgroYield Verified</strong> status is set to expire on
                <strong>${formattedDate}</strong> — just 3 days away.
              </p>

              <!-- Expiry card -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#fef9c3;border:1px solid #fde68a;border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0;font-size:12px;color:#92400e;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Expiry Date</p>
                    <p style="margin:6px 0 0;font-size:20px;font-weight:700;color:#78350f;">${formattedDate}</p>
                    ${planLabel ? `<p style="margin:4px 0 0;font-size:13px;color:#a16207;">Plan: ${planLabel}</p>` : ''}
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">
                Renew now to keep your verified badge, maintain trust with other members,
                and continue accessing all premium features on AgroYield Network.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background:#16a34a;border-radius:10px;">
                    <a href="https://agroyield.africa/pricing"
                      style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
                      Renew My Verification →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                Questions? Reply to this email or reach out at
                <a href="mailto:hello@agroyield.africa" style="color:#16a34a;text-decoration:none;">hello@agroyield.africa</a>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                © ${new Date().getFullYear()} AgroYield Network · Nigeria's Agricultural Professional Community
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;">
                You're receiving this because you have an active verified subscription on agroyield.africa
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
      })
      sent++
    } catch (emailErr) {
      console.error(`Failed to send reminder to ${profile.email}:`, emailErr)
      failed++
    }
  }

  return NextResponse.json({ sent, failed, total: expiring.length })
}
