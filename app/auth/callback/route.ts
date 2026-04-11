import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  // ── NEW: Handle token_hash flow (password reset via generateLink) ──
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash,
    })
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    return NextResponse.redirect(`${origin}/login?error=Invalid or expired reset link`)
  }
  // ── END NEW SECTION ──

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Password recovery flow — skip welcome email, go straight to reset page
      if (next === '/reset-password') {
        return NextResponse.redirect(`${origin}${next}`)
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, first_name')
          .eq('id', user.id)
          .single()
        
        if (profile && !profile.first_name) {
          try {
            await resend.emails.send({
              from: 'AgroYield Network <noreply@agroyield.africa>',
              to: user.email!,
              subject: 'Welcome to AgroYield Network 🌾',
              html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#060d09;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#060d09;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#0c1c11;border:1px solid #1c3825;border-radius:16px;overflow:hidden;max-width:560px;">
        <tr>
          <td style="padding:36px 48px;border-bottom:1px solid #1c3825;">
          <img src="https://agroyield.africa/logo-horizontal-white.png" alt="AgroYield Network" style="height:40px;width:auto;" />     
          </td>
        </tr>
        <tr>
          <td style="padding:40px 48px;">
            <p style="font-size:30px;margin:0 0 16px;font-weight:900;color:#f0fdf4;letter-spacing:-1px;">You're in. Welcome. 🎉</p>
            <p style="font-size:16px;color:#bbf7d0;line-height:1.75;margin:0 0 28px;">Your AgroYield Network account is confirmed. You now have access to Nigeria's first professional platform built entirely for agriculture. Let's get you set up.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f2318;border:1px solid #1c3825;border-radius:12px;margin:0 0 28px;">
              <tr>
                <td style="padding:24px 28px;">
                  <p style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#22c55e;margin:0 0 14px;">Your first step</p>
                  <p style="font-size:15px;color:#f0fdf4;font-weight:700;margin:0 0 8px;">Complete your profile</p>
                  <p style="font-size:14px;color:#bbf7d0;line-height:1.7;margin:0 0 20px;">Tell the network who you are — your role, institution, and area of focus. A complete profile helps other members find and connect with you.</p>
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="background:#22c55e;border-radius:10px;padding:12px 24px;">
                        <a href="${origin}/profile"
                           style="font-size:14px;font-weight:700;color:#030a05;text-decoration:none;display:block;white-space:nowrap;">
                          Complete My Profile &rarr;
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f2318;border:1px solid #1c3825;border-radius:12px;margin:0 0 32px;">
              <tr>
                <td style="padding:24px 28px;">
                  <p style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#22c55e;margin:0 0 14px;">What's waiting for you</p>
                  <p style="font-size:14px;color:#bbf7d0;line-height:2;margin:0;">
                    🤝 &nbsp;<strong style="color:#f0fdf4;">Member Directory</strong> — find researchers, farmers &amp; agripreneurs<br>
                    🎯 &nbsp;<strong style="color:#f0fdf4;">Opportunities</strong> — grants, mentorship &amp; events<br>
                    📊 &nbsp;<strong style="color:#f0fdf4;">Price Tracker</strong> — live commodity prices across Nigeria<br>
                    🛒 &nbsp;<strong style="color:#f0fdf4;">Marketplace</strong> — buy, sell &amp; trade agri products<br>
                    📚 &nbsp;<strong style="color:#f0fdf4;">Research Board</strong> — publish &amp; collaborate on research
                  </p>
                </td>
              </tr>
            </table>
            <p style="font-size:14px;color:#bbf7d0;line-height:1.75;margin:0 0 28px;">If you have any questions, reply to this email or reach us at <a href="mailto:hello@agroyield.africa" style="color:#22c55e;text-decoration:none;">hello@agroyield.africa</a>. We read every message.</p>
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#22c55e;border-radius:10px;padding:14px 28px;">
                  <a href="${origin}/dashboard"
                     style="font-size:14px;font-weight:700;color:#030a05;text-decoration:none;display:block;white-space:nowrap;">
                    Go to Dashboard &rarr;
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 48px;border-top:1px solid #1c3825;">
            <p style="font-size:12px;color:#4b7a5c;margin:0;line-height:1.6;">You created an account at agroyield.africa. We will never spam you.<br>© 2026 AgroYield Network · Nigeria</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
            })
          } catch (e) {
            console.error('Welcome email error:', e)
          }
          return NextResponse.redirect(`${origin}/profile`)
        }
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }
  return NextResponse.redirect(`${origin}/login`)
}
