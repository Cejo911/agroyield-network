import { createClient as createAdminClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)
const adminClient = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const { origin } = new URL(request.url)

    // Generate recovery link via Admin API (does NOT send an email)
    const { data, error } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${origin}/auth/callback?next=/reset-password`,
      },
    })

    if (error) {
      // Don't reveal whether the email exists — always show success to the user
      console.error('Generate link error:', error.message)
      return NextResponse.json({ success: true })
    }

   // Use the hashed_token from the response and build a link through our callback
    const token_hash = data.properties.hashed_token
    const resetLink = `${origin}/auth/callback?token_hash=${token_hash}&type=recovery&next=/reset-password`

    // Send branded email via Resend
    await resend.emails.send({
      from: 'AgroYield Network <noreply@agroyield.africa>',
      to: email,
      subject: 'Reset your AgroYield password',
      html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#060d09;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#060d09;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#0c1c11;border:1px solid #1c3825;border-radius:16px;overflow:hidden;max-width:560px;">
        <tr>
          <td style="padding:36px 48px;border-bottom:1px solid #1c3825;">
            <img src="https://agroyield.africa/logo-horizontal-white.png" alt="AgroYield Network" style="height:70px;width:auto;" />
          </td>
        </tr>
        <tr>
          <td style="padding:40px 48px;">
            <p style="font-size:26px;margin:0 0 16px;font-weight:900;color:#f0fdf4;letter-spacing:-1px;">Reset your password</p>
            <p style="font-size:16px;color:#bbf7d0;line-height:1.75;margin:0 0 28px;">We received a request to reset the password for your AgroYield Network account. Click the button below to choose a new password.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f2318;border:1px solid #1c3825;border-radius:12px;margin:0 0 28px;">
              <tr>
                <td style="padding:24px 28px;">
                  <p style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#22c55e;margin:0 0 14px;">Password reset</p>
                  <p style="font-size:14px;color:#bbf7d0;line-height:1.7;margin:0 0 20px;">This link will expire in 24 hours. If you didn't request this, you can safely ignore this email — your password won't change.</p>
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="background:#22c55e;border-radius:10px;padding:12px 24px;">
                        <a href="${resetLink}"
                           style="font-size:14px;font-weight:700;color:#030a05;text-decoration:none;display:block;white-space:nowrap;">
                          Reset My Password &rarr;
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <p style="font-size:14px;color:#bbf7d0;line-height:1.75;margin:0 0 28px;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="font-size:13px;color:#22c55e;word-break:break-all;margin:0 0 28px;">${resetLink}</p>
            <p style="font-size:14px;color:#bbf7d0;line-height:1.75;margin:0;">Need help? Contact us at <a href="mailto:hello@agroyield.africa" style="color:#22c55e;text-decoration:none;">hello@agroyield.africa</a></p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 48px;border-top:1px solid #1c3825;">
            <p style="font-size:12px;color:#4b7a5c;margin:0;line-height:1.6;">You're receiving this because a password reset was requested for this email at agroyield.africa.<br>&copy; 2026 AgroYield Network &middot; Nigeria</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Reset password error:', err)
    return NextResponse.json({ success: true }) // Always return success for security
  }
}