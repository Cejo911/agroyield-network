import { NextResponse } from 'next/server'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { SENDERS, INBOXES } from '@/lib/email/senders'
import { getResend } from '@/lib/email/client'
import { getSupabaseAnon } from '@/lib/supabase/admin'


export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  const { success } = rateLimit(ip, { limit: 5, windowMs: 60_000 })
  if (!success) return rateLimitResponse()

  const { email } = await request.json()

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  const { error: dbError } = await getSupabaseAnon()
    .from('waitlist_signups')
    .insert([{ email, source: 'waitlist_page', ip_address: ip }])

  const isDuplicate = dbError?.code === '23505'

  if (dbError && !isDuplicate) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  try {
    // Confirmation to the subscriber
    await getResend().emails.send({
      from: SENDERS.noreply,
      to: email,
      subject: "You're on the AgroYield waitlist 🌾",
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
        </tr>
        <tr>
          <td style="padding:40px 48px;">
            <p style="font-size:30px;margin:0 0 16px;font-weight:900;color:#f0fdf4;letter-spacing:-1px;">You're on the list! 🌱</p>
            <p style="font-size:16px;color:#bbf7d0;line-height:1.75;margin:0 0 28px;">Welcome to AgroYield Network. You're among the first people building this movement — and we're genuinely grateful you're here.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f2318;border:1px solid #1c3825;border-radius:12px;margin:0 0 32px;">
              <tr>
                <td style="padding:24px 28px;">
                  <p style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#22c55e;margin:0 0 14px;">What you're getting access to</p>
                  <p style="font-size:14px;color:#bbf7d0;line-height:2;margin:0;">
                    🤝 &nbsp;Connections &amp; Insights Feed<br>
                    🎯 &nbsp;Grants, Events &amp; Mentorship<br>
                    🏷️ &nbsp;Live Commodity Price Tracker<br>
                    🤝 &nbsp;Agri Marketplace<br>
                    📚 &nbsp;Research Board
                  </p>
                </td>
              </tr>
            </table>
            <p style="font-size:15px;color:#bbf7d0;line-height:1.75;margin:0 0 32px;">We'll send you a personal invite when the platform opens. Until then — tell a friend in agriculture. The more we grow, the faster we launch.</p>
            <a href="https://agroyield.africa" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:700;color:#030a05;background:linear-gradient(135deg,#22c55e,#16a34a);border-radius:10px;text-decoration:none;">Visit AgroYield →</a>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 48px;border-top:1px solid #1c3825;">
            <p style="font-size:12px;color:#4b7a5c;margin:0;line-height:1.6;">You signed up at agroyield.africa. We will never spam you.<br>© 2026 AgroYield Network · Nigeria</p>
            <p style="font-size:10px;color:#4b7a5c;opacity:0.6;margin:4px 0 0;">An Agcoms International Project</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
    })

    // Admin notification to hello@agroyield.africa
    if (!isDuplicate) {
      await getResend().emails.send({
        from: SENDERS.noreply,
        to: INBOXES.hello,
        subject: `🌱 New waitlist signup — ${email}`,
        html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
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
            <p style="font-size:28px;margin:0 0 24px;font-weight:900;color:#f0fdf4;letter-spacing:-1px;">Someone just joined 🌱</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f2318;border:1px solid #1c3825;border-radius:12px;margin:0 0 32px;">
              <tr>
                <td style="padding:24px 28px;">
                  <p style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#22c55e;margin:0 0 14px;">Signup Details</p>
                  <p style="font-size:14px;color:#6ee7b7;margin:0 0 8px;"><strong style="color:#f0fdf4;">Email:</strong> <a href="mailto:${email}" style="color:#22c55e;text-decoration:none;">${email}</a></p>
                  <p style="font-size:14px;color:#6ee7b7;margin:0 0 8px;"><strong style="color:#f0fdf4;">Source:</strong> waitlist_page</p>
                  <p style="font-size:14px;color:#6ee7b7;margin:0;"><strong style="color:#f0fdf4;">Time:</strong> ${new Date().toLocaleString('en-GB', { timeZone: 'Africa/Lagos', dateStyle: 'full', timeStyle: 'short' })}</p>
                </td>
              </tr>
            </table>
            <p style="font-size:14px;color:#bbf7d0;line-height:1.75;margin:0;">Check the full waitlist in your <a href="https://supabase.com" style="color:#22c55e;text-decoration:none;">Supabase dashboard</a> under the <strong style="color:#f0fdf4;">waitlist_signups</strong> table.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 48px;border-top:1px solid #1c3825;">
            <p style="font-size:12px;color:#4b7a5c;margin:0;">Sent automatically from agroyield.africa</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
      })
    }
  } catch (e) {
    console.error('Email error:', e)
  }

  return NextResponse.json({ success: true })
}
