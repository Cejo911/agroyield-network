import { createClient as createAdminClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { SENDERS } from '@/lib/email/senders'
import { getResend } from '@/lib/email/client'

/**
 * Records a login device and emails the user if it's a new device.
 * Silent: never throws. Safe to fire-and-forget from login/callback handlers.
 */
export async function recordLoginAndNotify(params: {
  userId: string
  userEmail: string | null | undefined
  ip:  string | null | undefined
  userAgent: string | null | undefined
}): Promise<{ new: boolean }> {
  try {
    const { userId, userEmail } = params
    const rawIp     = params.ip ?? 'unknown'
    const userAgent = params.userAgent ?? 'unknown'

    // Truncate IPv4 to /24 for privacy before hashing
    const ipPrefix = rawIp.includes('.') && rawIp.split('.').length === 4
      ? rawIp.split('.').slice(0, 3).join('.') + '.x'
      : rawIp.split(':').slice(0, 4).join(':')

    const ipHash  = crypto.createHash('sha256').update(ipPrefix).digest('hex')
    const uaHash  = crypto.createHash('sha256').update(userAgent).digest('hex')
    const uaLabel = summariseUserAgent(userAgent)

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: existing } = await admin
      .from('login_history')
      .select('id')
      .eq('user_id', userId)
      .eq('ip_hash', ipHash)
      .eq('ua_hash', uaHash)
      .maybeSingle()

    if (existing) {
      await admin
        .from('login_history')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', existing.id)
      return { new: false }
    }

    await admin.from('login_history').insert({
      user_id:  userId,
      ip_hash:  ipHash,
      ua_hash:  uaHash,
      ip_label: ipPrefix,
      ua_label: uaLabel,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (admin as any)
      .from('profiles')
      .select('first_name, notify_on_login')
      .eq('id', userId)
      .maybeSingle()

    const { count } = await admin
      .from('login_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    const isFirstEverLogin = (count ?? 0) <= 1

    if (profile?.notify_on_login !== false && !isFirstEverLogin && userEmail) {
      const firstName = profile?.first_name ?? 'there'
      const when = new Date().toLocaleString('en-GB', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
        timeZone: 'Africa/Lagos', timeZoneName: 'short',
      })

      try {
        await getResend().emails.send({
          from: SENDERS.security,
          to: userEmail,
          subject: 'New sign-in to your AgroYield account',
          html: buildEmail({ firstName, when, device: uaLabel, ipLabel: ipPrefix }),
        })
      } catch (e) {
        console.error('login-notification email failed:', e)
      }
    }

    return { new: true }
  } catch (e) {
    console.error('recordLoginAndNotify error:', e)
    return { new: false }
  }
}

function summariseUserAgent(ua: string): string {
  const browser =
    /Edg\//.test(ua)     ? 'Edge'    :
    /Chrome\//.test(ua)  ? 'Chrome'  :
    /Firefox\//.test(ua) ? 'Firefox' :
    /Safari\//.test(ua)  ? 'Safari'  :
    'a browser'
  const os =
    /Windows/.test(ua)   ? 'Windows' :
    /Mac OS X/.test(ua)  ? 'macOS'   :
    /Android/.test(ua)   ? 'Android' :
    /iPhone|iPad/.test(ua) ? 'iOS'   :
    /Linux/.test(ua)     ? 'Linux'   :
    'an unknown device'
  return `${browser} on ${os}`
}

function buildEmail({ firstName, when, device, ipLabel }: {
  firstName: string; when: string; device: string; ipLabel: string;
}): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#060d09;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#060d09;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#0c1c11;border:1px solid #1c3825;border-radius:16px;overflow:hidden;max-width:560px;">
        <tr>
          <td style="padding:32px 48px;border-bottom:1px solid #1c3825;">
            <img src="https://agroyield.africa/logo-horizontal-white.png" alt="AgroYield Network" style="height:58px;width:auto;" />
          </td>
        </tr>
        <tr>
          <td style="padding:36px 48px;">
            <p style="font-size:24px;margin:0 0 16px;font-weight:900;color:#f0fdf4;letter-spacing:-0.5px;">New sign-in to your account</p>
            <p style="font-size:15px;color:#bbf7d0;line-height:1.7;margin:0 0 24px;">Hi ${firstName}, we noticed a new sign-in to your AgroYield Network account from a device we haven't seen before.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f2318;border:1px solid #1c3825;border-radius:12px;margin:0 0 24px;">
              <tr><td style="padding:20px 24px;">
                <p style="font-size:13px;color:#6ee7b7;margin:0 0 6px;"><strong style="color:#f0fdf4;">When</strong></p>
                <p style="font-size:14px;color:#bbf7d0;margin:0 0 14px;">${when}</p>
                <p style="font-size:13px;color:#6ee7b7;margin:0 0 6px;"><strong style="color:#f0fdf4;">Device</strong></p>
                <p style="font-size:14px;color:#bbf7d0;margin:0 0 14px;">${device}</p>
                <p style="font-size:13px;color:#6ee7b7;margin:0 0 6px;"><strong style="color:#f0fdf4;">Approximate IP</strong></p>
                <p style="font-size:14px;color:#bbf7d0;margin:0;">${ipLabel}</p>
              </td></tr>
            </table>
            <p style="font-size:14px;color:#bbf7d0;line-height:1.7;margin:0 0 18px;"><strong style="color:#f0fdf4;">If this was you</strong> — no action needed. You can safely ignore this email.</p>
            <p style="font-size:14px;color:#bbf7d0;line-height:1.7;margin:0 0 24px;"><strong style="color:#fca5a5;">If this wasn't you</strong> — reset your password immediately and contact us at <a href="mailto:hello@agroyield.africa" style="color:#22c55e;text-decoration:none;">hello@agroyield.africa</a>.</p>
            <table cellpadding="0" cellspacing="0">
              <tr><td style="background:#22c55e;border-radius:10px;padding:12px 24px;">
                <a href="https://agroyield.africa/forgot-password" style="font-size:14px;font-weight:700;color:#030a05;text-decoration:none;display:block;white-space:nowrap;">Reset password &rarr;</a>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 48px;border-top:1px solid #1c3825;">
            <p style="font-size:12px;color:#4b7a5c;margin:0;line-height:1.6;">You're receiving this because new-device sign-in alerts are enabled. You can turn them off in your profile settings.<br>© 2026 AgroYield Network · Nigeria</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}
