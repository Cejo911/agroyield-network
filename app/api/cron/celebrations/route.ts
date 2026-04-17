/**
 * Daily celebration emails — sends birthday & membership-anniversary greetings.
 *
 * Schedule: daily at 7 AM WAT (via Vercel cron)
 *
 * Birthday: matches month+day of date_of_birth against today.
 * Anniversary: matches month+day of created_at against today (skips first day).
 */

import { runCron, dailyKey } from '@/lib/cron'
import { SENDERS } from '@/lib/email/senders'
import { getResend } from '@/lib/email/client'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://agroyield.africa'

export async function GET(request: Request) {
  return runCron(request, {
    jobName: 'celebrations',
    idempotencyKey: dailyKey(),
    handler: async () => {
      const admin = getSupabaseAdmin()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const adminAny = admin as any

      // Kill switch — admin can pause celebrations from the dashboard
      const { data: celebrationsSetting } = await adminAny
        .from('settings').select('value').eq('key', 'celebrations_enabled').maybeSingle()
      if (celebrationsSetting?.value === 'false') {
        return {
          processedCount: 0,
          metadata: { skipped_reason: 'Celebrations disabled in admin settings' },
        }
      }

      const now = new Date()
      const month = now.getMonth() + 1 // 1-12
      const day = now.getDate()

      let birthdaySent = 0
      let anniversarySent = 0
      let failed = 0

      // ── Birthday emails ──
      // Query profiles where date_of_birth month+day matches today
      // date_of_birth is stored as text (ISO date string e.g. "1995-06-15")
      const { data: birthdayProfiles } = await adminAny
        .from('profiles')
        .select('id, first_name, last_name, email, date_of_birth')
        .not('date_of_birth', 'is', null)
        .not('email', 'is', null)

      const birthdayMatches = (birthdayProfiles ?? []).filter((p: { date_of_birth: string }) => {
        if (!p.date_of_birth) return false
        const dob = new Date(p.date_of_birth)
        return dob.getMonth() + 1 === month && dob.getDate() === day
      })

      for (const profile of birthdayMatches) {
        try {
          await getResend().emails.send({
            from: SENDERS.hello,
            to: profile.email,
            subject: `🎂 Happy Birthday, ${profile.first_name ?? 'friend'}! — From the AgroYield Family`,
            html: buildBirthdayHtml(profile.first_name ?? 'there'),
          })
          birthdaySent++
        } catch (err) {
          console.error(`Birthday email failed for ${profile.email}:`, err)
          failed++
        }
        // Rate limit
        await new Promise(r => setTimeout(r, 100))
      }

      // ── Anniversary emails ──
      // Query profiles where created_at month+day matches today AND created at least 1 year ago
      const { data: allProfiles } = await adminAny
        .from('profiles')
        .select('id, first_name, last_name, email, created_at')
        .not('email', 'is', null)

      const anniversaryMatches = (allProfiles ?? []).filter((p: { created_at: string }) => {
        if (!p.created_at) return false
        const joined = new Date(p.created_at)
        // Must be at least 1 year old to get anniversary email
        const yearsOnPlatform = now.getFullYear() - joined.getFullYear()
        if (yearsOnPlatform < 1) return false
        return joined.getMonth() + 1 === month && joined.getDate() === day
      })

      for (const profile of anniversaryMatches) {
        const joinedDate = new Date(profile.created_at)
        const years = now.getFullYear() - joinedDate.getFullYear()
        try {
          await getResend().emails.send({
            from: SENDERS.hello,
            to: profile.email,
            subject: `🎉 Happy ${years}-Year Anniversary on AgroYield, ${profile.first_name ?? 'friend'}!`,
            html: buildAnniversaryHtml(profile.first_name ?? 'there', years),
          })
          anniversarySent++
        } catch (err) {
          console.error(`Anniversary email failed for ${profile.email}:`, err)
          failed++
        }
        await new Promise(r => setTimeout(r, 100))
      }

      return {
        processedCount: birthdayMatches.length + anniversaryMatches.length,
        successCount: birthdaySent + anniversarySent,
        failureCount: failed,
        metadata: {
          birthdaySent,
          anniversarySent,
          birthdayMatches: birthdayMatches.length,
          anniversaryMatches: anniversaryMatches.length,
        },
      }
    },
  })
}

/* ── Birthday Email Template ── */
function buildBirthdayHtml(firstName: string): string {
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
              <div style="text-align:center;margin-bottom:24px;">
                <span style="font-size:64px;">🎂</span>
              </div>
              <h1 style="margin:0 0 8px;font-size:24px;color:#111827;text-align:center;">
                Happy Birthday, ${firstName}!
              </h1>
              <p style="margin:0 0 24px;font-size:16px;color:#6b7280;text-align:center;line-height:1.6;">
                The entire AgroYield family celebrates you today.
              </p>

              <!-- Celebration card -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:24px;text-align:center;">
                    <p style="margin:0 0 8px;font-size:15px;color:#166534;line-height:1.6;">
                      On this special day, we want you to know how much we value your membership
                      in our growing agricultural community. Your contributions and presence
                      make AgroYield stronger.
                    </p>
                    <p style="margin:0;font-size:15px;color:#166534;font-weight:600;">
                      Here's to another year of growth and impact! 🌱
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.6;text-align:center;">
                Continue connecting, learning, and growing with professionals across Nigeria's agricultural landscape.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
                <tr>
                  <td style="background:#16a34a;border-radius:10px;">
                    <a href="${BASE_URL}/dashboard"
                      style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
                      Visit Your Dashboard →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                © ${new Date().getFullYear()} AgroYield Network · Nigeria's Agricultural Professional Community
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;">
                Sent with love from the AgroYield family
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

/* ── Anniversary Email Template ── */
function buildAnniversaryHtml(firstName: string, years: number): string {
  const yearLabel = years === 1 ? '1 Year' : `${years} Years`
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
              <div style="text-align:center;margin-bottom:24px;">
                <span style="font-size:64px;">🎉</span>
              </div>
              <h1 style="margin:0 0 8px;font-size:24px;color:#111827;text-align:center;">
                Happy ${yearLabel} Anniversary, ${firstName}!
              </h1>
              <p style="margin:0 0 24px;font-size:16px;color:#6b7280;text-align:center;line-height:1.6;">
                It's been ${yearLabel} since you joined the AgroYield family.
              </p>

              <!-- Anniversary card -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:24px;text-align:center;">
                    <p style="margin:0 0 4px;font-size:12px;color:#1e40af;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Member Since</p>
                    <p style="margin:0 0 12px;font-size:28px;font-weight:700;color:#1e3a5f;">${yearLabel}</p>
                    <p style="margin:0;font-size:15px;color:#3b82f6;line-height:1.6;">
                      Thank you for being part of Nigeria's growing agricultural network.
                      Your journey and contributions continue to inspire us all.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.6;text-align:center;">
                We look forward to many more years of connecting, growing, and transforming
                agriculture together. Keep building, keep networking, keep growing.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
                <tr>
                  <td style="background:#16a34a;border-radius:10px;">
                    <a href="${BASE_URL}/dashboard"
                      style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
                      See What's New →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                © ${new Date().getFullYear()} AgroYield Network · Nigeria's Agricultural Professional Community
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;">
                Celebrating ${yearLabel} of your membership
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
