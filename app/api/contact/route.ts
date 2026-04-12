import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  const { success } = rateLimit(ip, { limit: 5, windowMs: 60_000 })
  if (!success) return rateLimitResponse()

  const { name, email, subject, message } = await request.json()

  if (!name || !email || !message) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { error: dbError } = await supabase
    .from('contact_messages')
    .insert([{ name, email, subject, message }])

  if (dbError) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  try {
    // Confirmation to the sender
    await resend.emails.send({
      from: 'AgroYield Network <noreply@agroyield.africa>',
      to: email,
      subject: "We've received your message 🌾",
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
            <p style="font-size:28px;margin:0 0 16px;font-weight:900;color:#f0fdf4;letter-spacing:-1px;">Message received ✅</p>
            <p style="font-size:16px;color:#bbf7d0;line-height:1.75;margin:0 0 28px;">Hi ${name.split(' ')[0]}, thanks for reaching out. We've received your message and will get back to you within <strong style="color:#f0fdf4;">1–2 business days</strong>.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f2318;border:1px solid #1c3825;border-radius:12px;margin:0 0 32px;">
              <tr>
                <td style="padding:24px 28px;">
                  <p style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#22c55e;margin:0 0 14px;">Your message summary</p>
                  <p style="font-size:13px;color:#6ee7b7;margin:0 0 4px;"><strong style="color:#f0fdf4;">Subject:</strong> ${subject || 'General Enquiry'}</p>
                  <p style="font-size:13px;color:#bbf7d0;line-height:1.7;margin:8px 0 0;">${message.replace(/\n/g, '<br>')}</p>
                </td>
              </tr>
            </table>
            <p style="font-size:15px;color:#bbf7d0;line-height:1.75;margin:0 0 32px;">If your enquiry is urgent, you can also reach us directly at <a href="mailto:hello@agroyield.africa" style="color:#22c55e;text-decoration:none;">hello@agroyield.africa</a>.</p>
            <a href="https://agroyield.africa" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:700;color:#030a05;background:linear-gradient(135deg,#22c55e,#16a34a);border-radius:10px;text-decoration:none;">Visit AgroYield →</a>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 48px;border-top:1px solid #1c3825;">
            <p style="font-size:12px;color:#4b7a5c;margin:0;line-height:1.6;">You're receiving this because you contacted us at agroyield.africa/contact.<br>© 2026 AgroYield Network · Nigeria</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
    })

    // Internal notification to you
    await resend.emails.send({
      from: 'AgroYield Network <noreply@agroyield.africa>',
      to: 'hello@agroyield.africa',
      subject: `New contact message from ${name} — ${subject || 'General Enquiry'}`,
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
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f2318;border:1px solid #1c3825;border-radius:12px;margin:0 0 28px;">
              <tr>
                <td style="padding:24px 28px;">
                  <p style="font-size:13px;color:#6ee7b7;margin:0 0 8px;"><strong style="color:#f0fdf4;">Name:</strong> ${name}</p>
                  <p style="font-size:13px;color:#6ee7b7;margin:0 0 8px;"><strong style="color:#f0fdf4;">Email:</strong> <a href="mailto:${email}" style="color:#22c55e;text-decoration:none;">${email}</a></p>
                  <p style="font-size:13px;color:#6ee7b7;margin:0 0 8px;"><strong style="color:#f0fdf4;">Subject:</strong> ${subject || 'General Enquiry'}</p>
                  <p style="font-size:13px;color:#6ee7b7;margin:8px 0 0;"><strong style="color:#f0fdf4;">Message:</strong></p>
                  <p style="font-size:14px;color:#bbf7d0;line-height:1.75;margin:8px 0 0;">${message.replace(/\n/g, '<br>')}</p>
                </td>
              </tr>
            </table>
            <a href="mailto:${email}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:700;color:#030a05;background:linear-gradient(135deg,#22c55e,#16a34a);border-radius:10px;text-decoration:none;">Reply to ${name.split(' ')[0]} →</a>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 48px;border-top:1px solid #1c3825;">
            <p style="font-size:12px;color:#4b7a5c;margin:0;">Sent via agroyield.africa/contact</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
    })
  } catch (e) {
    console.error('Email error:', e)
  }

  return NextResponse.json({ success: true })
}
