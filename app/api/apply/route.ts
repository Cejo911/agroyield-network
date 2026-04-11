import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET() {
  return NextResponse.json({ status: 'ok' })
}

export async function POST(request: NextRequest) {
  const { opportunity_id } = await request.json()

  if (!opportunity_id) {
    return NextResponse.json({ error: 'opportunity_id required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get opportunity details
  const { data: opportunity } = await supabase
    .from('opportunities')
    .select('id, title, organisation, user_id')
    .eq('id', opportunity_id)
    .single()

  if (!opportunity) {
    return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
  }

  // Don't notify if someone applies to their own opportunity
  if (opportunity.user_id === user.id) {
    return NextResponse.json({ success: true })
  }

  // Get applicant's profile
  const { data: applicantProfile } = await supabase
    .from('profiles')
    .select('first_name, last_name, role')
    .eq('id', user.id)
    .single()

  const applicantName = applicantProfile
    ? `${applicantProfile.first_name ?? ''} ${applicantProfile.last_name ?? ''}`.trim() || 'A member'
    : 'A member'

  const applicantRole = applicantProfile?.role ?? 'AgroYield Member'

  // Get poster's email via admin client (service role required)
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: { user: poster } } = await adminSupabase.auth.admin.getUserById(opportunity.user_id)

  if (!poster?.email) {
    return NextResponse.json({ success: true })
  }

  const profileUrl = `https://agroyield.africa/profile/${user.id}`
  const opportunityUrl = `https://agroyield.africa/opportunities/${opportunity_id}`

  try {
    await resend.emails.send({
      from: 'AgroYield Network <noreply@agroyield.africa>',
      to: poster.email,
      subject: `New application for "${opportunity.title}" 🎯`,
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
            <p style="font-size:30px;margin:0 0 16px;font-weight:900;color:#f0fdf4;letter-spacing:-1px;">New application 🎯</p>
            <p style="font-size:16px;color:#bbf7d0;line-height:1.75;margin:0 0 28px;">Someone just applied to your opportunity on AgroYield Network.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f2318;border:1px solid #1c3825;border-radius:12px;margin:0 0 28px;">
              <tr>
                <td style="padding:24px 28px;">
                  <p style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#22c55e;margin:0 0 16px;">Applicant</p>
                  <p style="font-size:18px;font-weight:800;color:#f0fdf4;margin:0 0 6px;">${applicantName}</p>
                  <p style="font-size:14px;color:#6ee7b7;margin:0 0 20px;">${applicantRole}</p>
                  <a href="${profileUrl}" style="display:inline-block;padding:10px 20px;font-size:13px;font-weight:700;color:#030a05;background:linear-gradient(135deg,#22c55e,#16a34a);border-radius:8px;text-decoration:none;">View Profile →</a>
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f2318;border:1px solid #1c3825;border-radius:12px;margin:0 0 32px;">
              <tr>
                <td style="padding:24px 28px;">
                  <p style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#22c55e;margin:0 0 14px;">Your Opportunity</p>
                  <p style="font-size:15px;font-weight:700;color:#f0fdf4;margin:0 0 6px;">${opportunity.title}</p>
                  ${opportunity.organisation ? `<p style="font-size:13px;color:#bbf7d0;margin:0 0 16px;">🏛 ${opportunity.organisation}</p>` : ''}
                  <a href="${opportunityUrl}" style="font-size:13px;color:#22c55e;text-decoration:none;">View listing →</a>
                </td>
              </tr>
            </table>
            <p style="font-size:14px;color:#bbf7d0;line-height:1.75;margin:0;">Review the applicant's profile and reach out directly if they are a good fit. All contact happens off-platform for now.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 48px;border-top:1px solid #1c3825;">
            <p style="font-size:12px;color:#4b7a5c;margin:0;line-height:1.6;">Sent automatically from agroyield.africa<br>© 2026 AgroYield Network · Nigeria</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    })
  } catch (e) {
    console.error('Apply notification email error:', e)
  }

  return NextResponse.json({ success: true })
}
