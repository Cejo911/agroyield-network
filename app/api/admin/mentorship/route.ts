import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { logAdminAction } from '@/lib/admin/audit-log'
import { SENDERS } from '@/lib/email/senders'
import { getResend } from '@/lib/email/client'
import { slackAlert } from '@/lib/slack'

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabaseAny
      .from('profiles').select('is_admin, admin_role, admin_permissions').eq('id', user.id).single()
    const p = profile as Record<string, unknown> | null
    if (!p?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if (p.admin_role !== 'super') {
      const perms = p.admin_permissions as Record<string, boolean> | null
      if (!perms?.mentorship) return NextResponse.json({ error: 'No permission' }, { status: 403 })
    }

    const { id, targetType, action: mentorAction, reason } = await request.json() as {
      id: string
      targetType: 'mentor' | 'request' | 'session'
      action: 'deactivate' | 'reactivate' | 'cancel' | 'approve' | 'reject'
      reason?: string
    }

    // Use service role to bypass RLS
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminAny = adminClient as any

    if (targetType === 'mentor') {
      if (mentorAction === 'deactivate') {
        await adminAny.from('mentor_profiles').update({ is_active: false }).eq('user_id', id)
      } else if (mentorAction === 'reactivate') {
        await adminAny.from('mentor_profiles').update({ is_active: true }).eq('user_id', id)
      } else if (mentorAction === 'approve') {
        // Approval is a two-column flip: approval_status goes to 'approved'
        // and is_active is set to true so the profile immediately surfaces
        // in /mentorship. If the mentor later pauses themselves, is_active
        // flips back to false but approval_status stays 'approved'.
        await adminAny.from('mentor_profiles').update({
          approval_status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user.id,
          is_active: true,
          rejection_reason: null,
        }).eq('user_id', id)

        // Fire-and-forget email + Slack. Mirrors verify_institution in
        // app/api/admin/member/route.ts — never block the admin's response
        // on notification plumbing.
        ;(async () => {
          try {
            const { data: mentorProfile } = await adminAny
              .from('profiles')
              .select('first_name, last_name')
              .eq('id', id)
              .single()

            const { data: { user: mentorUser } } = await adminClient.auth.admin.getUserById(id)
            const toEmail = mentorUser?.email
            const firstName = mentorProfile?.first_name || 'there'
            const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://agroyield.africa'

            if (toEmail) {
              await getResend().emails.send({
                from: SENDERS.hello,
                to: toEmail,
                subject: 'You\'re an approved AgroYield mentor 🌱',
                html: `<!doctype html>
<html><body style="margin:0;padding:0;background:#050f08;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e8f5ec;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#050f08;">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#0b1f13;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:32px 48px 16px;">
          <img src="${origin}/logo.png" alt="AgroYield Network" width="160" style="display:block;margin-bottom:24px;"/>
          <h1 style="font-size:22px;color:#22c55e;margin:0 0 16px;line-height:1.3;">You&rsquo;re in, ${firstName} 🌱</h1>
          <p style="font-size:15px;line-height:1.6;color:#e8f5ec;margin:0 0 16px;">
            Your mentor application has been approved. Your profile is now live in the AgroYield mentor directory and early-career professionals can start sending you requests.
          </p>
          <p style="font-size:14px;line-height:1.6;color:#b6d4bf;margin:0 0 24px;">
            A quick note: mentees see your availability, expertise, and session formats — keep them updated as your bandwidth changes, and you&rsquo;ll only get requests that match.
          </p>
        </td></tr>
        <tr><td style="padding:0 48px 32px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:#22c55e;border-radius:8px;">
            <a href="${origin}/mentorship/${id}" style="display:inline-block;padding:12px 24px;color:#050f08;font-weight:600;text-decoration:none;font-size:14px;">
              View your mentor profile &rarr;
            </a>
          </td></tr></table>
        </td></tr>
        <tr><td style="padding:24px 48px;border-top:1px solid #1c3825;">
          <p style="font-size:12px;color:#4b7a5c;margin:0;line-height:1.6;">
            Questions? Reply to this email or reach us at
            <a href="mailto:hello@agroyield.africa" style="color:#22c55e;text-decoration:none;">hello@agroyield.africa</a>.<br>
            &copy; 2026 AgroYield Network &middot; Nigeria
          </p>
          <p style="font-size:10px;color:#4b7a5c;opacity:0.6;margin:4px 0 0;">An Agcoms International Project</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
              })
            }

            await slackAlert({
              title: 'Mentor Approved',
              level: 'info',
              fields: {
                'Mentor': `${mentorProfile?.first_name ?? ''} ${mentorProfile?.last_name ?? ''}`.trim() || 'Unknown',
                'Email': toEmail ?? 'unknown',
                'Approved by': user.email ?? user.id,
              },
            })
          } catch (e) {
            console.error('approve_mentor notification error:', e)
          }
        })()
      } else if (mentorAction === 'reject') {
        const trimmedReason = typeof reason === 'string' ? reason.trim().slice(0, 1000) : ''
        if (!trimmedReason) {
          return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 })
        }

        await adminAny.from('mentor_profiles').update({
          approval_status: 'rejected',
          approved_at: null,
          approved_by: user.id,
          is_active: false,
          rejection_reason: trimmedReason,
        }).eq('user_id', id)

        // Fire-and-forget notification — empathetic tone, explicit reason,
        // invitation to resubmit. Rejections are the highest-friction touch
        // point in the mentor flow so the copy has to land well.
        ;(async () => {
          try {
            const { data: mentorProfile } = await adminAny
              .from('profiles')
              .select('first_name, last_name')
              .eq('id', id)
              .single()

            const { data: { user: mentorUser } } = await adminClient.auth.admin.getUserById(id)
            const toEmail = mentorUser?.email
            const firstName = mentorProfile?.first_name || 'there'
            const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://agroyield.africa'

            if (toEmail) {
              await getResend().emails.send({
                from: SENDERS.hello,
                to: toEmail,
                subject: 'An update on your AgroYield mentor application',
                html: `<!doctype html>
<html><body style="margin:0;padding:0;background:#050f08;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e8f5ec;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#050f08;">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#0b1f13;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:32px 48px 16px;">
          <img src="${origin}/logo.png" alt="AgroYield Network" width="160" style="display:block;margin-bottom:24px;"/>
          <h1 style="font-size:22px;color:#e8f5ec;margin:0 0 16px;line-height:1.3;">Hi ${firstName},</h1>
          <p style="font-size:15px;line-height:1.6;color:#e8f5ec;margin:0 0 16px;">
            Thanks for applying to mentor on AgroYield Network. We&rsquo;re not able to approve your application as-is, but we&rsquo;d love for you to address the note below and resubmit.
          </p>
          <div style="background:#1a2d20;border-left:3px solid #f59e0b;padding:12px 16px;border-radius:4px;margin:16px 0;">
            <p style="font-size:13px;line-height:1.6;color:#fde68a;margin:0;font-style:italic;">
              ${trimmedReason.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}
            </p>
          </div>
          <p style="font-size:14px;line-height:1.6;color:#b6d4bf;margin:0 0 24px;">
            Update your profile with this feedback and save — we&rsquo;ll re-review automatically.
          </p>
        </td></tr>
        <tr><td style="padding:0 48px 32px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:#22c55e;border-radius:8px;">
            <a href="${origin}/mentorship/become-mentor" style="display:inline-block;padding:12px 24px;color:#050f08;font-weight:600;text-decoration:none;font-size:14px;">
              Update my application &rarr;
            </a>
          </td></tr></table>
        </td></tr>
        <tr><td style="padding:24px 48px;border-top:1px solid #1c3825;">
          <p style="font-size:12px;color:#4b7a5c;margin:0;line-height:1.6;">
            Questions? Reply to this email or reach us at
            <a href="mailto:hello@agroyield.africa" style="color:#22c55e;text-decoration:none;">hello@agroyield.africa</a>.<br>
            &copy; 2026 AgroYield Network &middot; Nigeria
          </p>
          <p style="font-size:10px;color:#4b7a5c;opacity:0.6;margin:4px 0 0;">An Agcoms International Project</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
              })
            }

            await slackAlert({
              title: 'Mentor Rejected',
              level: 'warning',
              fields: {
                'Mentor': `${mentorProfile?.first_name ?? ''} ${mentorProfile?.last_name ?? ''}`.trim() || 'Unknown',
                'Email': toEmail ?? 'unknown',
                'Reason': trimmedReason,
                'Rejected by': user.email ?? user.id,
              },
            })
          } catch (e) {
            console.error('reject_mentor notification error:', e)
          }
        })()
      }
    } else if (targetType === 'request') {
      if (mentorAction === 'cancel') {
        await adminAny.from('mentorship_requests').update({ status: 'declined' }).eq('id', id)
      }
    } else if (targetType === 'session') {
      if (mentorAction === 'cancel') {
        await adminAny.from('mentorship_sessions').update({ status: 'cancelled' }).eq('id', id)
      }
    }

    await logAdminAction({
      adminId: user.id,
      action: `mentorship.${targetType}.${mentorAction}`,
      targetType: `mentorship_${targetType}`,
      targetId: id,
      details: mentorAction === 'reject' && typeof reason === 'string' ? { reason: reason.slice(0, 1000) } : {},
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
