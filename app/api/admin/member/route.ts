import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { logAdminAction } from '@/lib/admin/audit-log'
import { DEFAULT_MODERATOR_PERMISSIONS } from '@/lib/admin/permissions'
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
      .from('profiles').select('is_admin, admin_role').eq('id', user.id).single()
    const adminProfile = profile as Record<string, unknown> | null
    if (!adminProfile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { userId, action, permissions, tier } = await request.json() as {
      userId: string
      action:
        | 'suspend' | 'unsuspend'
        | 'set_tier'
        | 'makesuper' | 'makemoderator' | 'removeadmin'
        | 'update_permissions'
        | 'verify_institution'
      permissions?: Record<string, boolean>
      tier?: 'free' | 'pro' | 'growth'
    }

    // These actions require super admin
    const superOnly = ['set_tier', 'makesuper', 'makemoderator', 'removeadmin', 'update_permissions']
    if (superOnly.includes(action) && adminProfile.admin_role !== 'super') {
      return NextResponse.json({ error: 'Forbidden — super admin only' }, { status: 403 })
    }

    // Moderators need 'members' permission for suspend/unsuspend
    if (['suspend', 'unsuspend'].includes(action) && adminProfile.admin_role !== 'super') {
      const { data: modProfile } = await supabaseAny
        .from('profiles').select('admin_permissions').eq('id', user.id).single()
      const perms = (modProfile as Record<string, unknown>)?.admin_permissions as Record<string, boolean> | null
      if (!perms?.members) {
        return NextResponse.json({ error: 'No permission for member management' }, { status: 403 })
      }
    }

    // Prevent super admin from removing their own admin status
    if (action === 'removeadmin' && userId === user.id) {
      return NextResponse.json({ error: 'Cannot remove your own admin status' }, { status: 400 })
    }

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminAny = adminClient as any

    if (action === 'suspend') {
      await adminAny.from('profiles').update({ is_suspended: true }).eq('id', userId)
      await adminClient.auth.admin.updateUserById(userId, { ban_duration: '87600h' })
    } else if (action === 'unsuspend') {
      // Stamp last_suspension_cleared_at = now() so the auto-suspend
      // threshold check in /api/report POST resets the user's
      // "distinct reporters" counter from this moment forward. Without
      // this stamp, an unsuspended user with a stale stack of past
      // reports would be re-suspended on the next single new report.
      // We keep the report rows themselves intact for audit history.
      await adminAny.from('profiles').update({
        is_suspended: false,
        last_suspension_cleared_at: new Date().toISOString(),
      }).eq('id', userId)
      await adminClient.auth.admin.updateUserById(userId, { ban_duration: 'none' })
    } else if (action === 'set_tier') {
      if (!tier || !['free', 'pro', 'growth'].includes(tier)) {
        return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
      }
      if (tier === 'free') {
        // Downgrade to free — clear subscription
        await adminAny.from('profiles').update({
          subscription_tier: 'free',
          is_verified: false,
          is_elite: false,
          subscription_plan: null,
          subscription_expires_at: null,
          verified_at: null,
        }).eq('id', userId)
      } else {
        // Upgrade to pro or growth — admin-granted, no expiry
        await adminAny.from('profiles').update({
          subscription_tier: tier,
          is_verified: true,
          verified_at: new Date().toISOString(),
          subscription_plan: 'admin',
          subscription_expires_at: null,
        }).eq('id', userId)
      }
    } else if (action === 'makesuper') {
      await adminAny.from('profiles').update({
        is_admin: true,
        admin_role: 'super',
        admin_permissions: null, // Super admins don't need permissions
      }).eq('id', userId)
    } else if (action === 'makemoderator') {
      await adminAny.from('profiles').update({
        is_admin: true,
        admin_role: 'moderator',
        admin_permissions: DEFAULT_MODERATOR_PERMISSIONS,
      }).eq('id', userId)
    } else if (action === 'removeadmin') {
      await adminAny.from('profiles').update({
        is_admin: false,
        admin_role: null,
        admin_permissions: null,
      }).eq('id', userId)
    } else if (action === 'verify_institution') {
      await adminAny.from('profiles').update({
        is_institution_verified: true,
      }).eq('id', userId)

      // Fire-and-forget: notify the institution + alert the team.
      // Never block the admin response on email or Slack.
      ;(async () => {
        try {
          const { data: verifiedProfile } = await adminAny
            .from('profiles')
            .select('institution_display_name, contact_person_name, first_name')
            .eq('id', userId)
            .single()

          // Look up the auth email (profiles doesn't store it)
          const { data: { user: verifiedUser } } = await adminClient.auth.admin.getUserById(userId)
          const toEmail = verifiedUser?.email
          const institutionName =
            verifiedProfile?.institution_display_name || 'Your institution'
          const contactName =
            verifiedProfile?.contact_person_name ||
            verifiedProfile?.first_name ||
            'there'
          const origin =
            process.env.NEXT_PUBLIC_SITE_URL || 'https://agroyield.africa'

          if (toEmail) {
            await getResend().emails.send({
              from: SENDERS.hello,
              to: toEmail,
              subject: `${institutionName} is now verified on AgroYield Network ✅`,
              html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#060d09;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#060d09;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#0c1c11;border:1px solid #1c3825;border-radius:16px;overflow:hidden;max-width:560px;">
        <tr><td style="padding:36px 48px;border-bottom:1px solid #1c3825;">
          <img src="${origin}/logo-horizontal-white.png" alt="AgroYield Network" style="height:70px;width:auto;" />
        </td></tr>
        <tr><td style="padding:40px 48px;">
          <p style="font-size:28px;margin:0 0 16px;font-weight:900;color:#f0fdf4;letter-spacing:-1px;">You're verified. 🎉</p>
          <p style="font-size:16px;color:#bbf7d0;line-height:1.75;margin:0 0 28px;">
            Hi ${contactName}, <strong style="color:#f0fdf4;">${institutionName}</strong> has been approved by our team. You can now post opportunities, grants, research, and marketplace listings on behalf of your institution.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f2318;border:1px solid #1c3825;border-radius:12px;margin:0 0 28px;">
            <tr><td style="padding:24px 28px;">
              <p style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#22c55e;margin:0 0 14px;">What you can do now</p>
              <p style="font-size:14px;color:#bbf7d0;line-height:2;margin:0;">
                🎯 &nbsp;<strong style="color:#f0fdf4;">Post opportunities</strong> — grants, roles, partnerships, events<br>
                💰 &nbsp;<strong style="color:#f0fdf4;">List grant programmes</strong> — publish your RFPs to the network<br>
                📚 &nbsp;<strong style="color:#f0fdf4;">Publish research</strong> — share findings and collaborations<br>
                🤝 &nbsp;<strong style="color:#f0fdf4;">Marketplace listings</strong> — buy, sell and source inputs
              </p>
            </td></tr>
          </table>
          <table cellpadding="0" cellspacing="0">
            <tr><td style="background:#22c55e;border-radius:10px;padding:14px 28px;">
              <a href="${origin}/dashboard" style="font-size:14px;font-weight:700;color:#030a05;text-decoration:none;display:block;white-space:nowrap;">
                Go to Dashboard &rarr;
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:24px 48px;border-top:1px solid #1c3825;">
          <p style="font-size:12px;color:#4b7a5c;margin:0;line-height:1.6;">
            If you have questions, reply to this email or reach us at
            <a href="mailto:hello@agroyield.africa" style="color:#22c55e;text-decoration:none;">hello@agroyield.africa</a>.<br>
            © 2026 AgroYield Network · Nigeria
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
            title: 'Institution Verified',
            level: 'info',
            fields: {
              'Institution': institutionName,
              'Contact': contactName,
              'Email': toEmail ?? 'unknown',
              'Verified by': user.email ?? user.id,
            },
          })
        } catch (e) {
          console.error('verify_institution notification error:', e)
        }
      })()
    } else if (action === 'update_permissions') {
      if (!permissions) {
        return NextResponse.json({ error: 'Permissions object required' }, { status: 400 })
      }
      await adminAny.from('profiles').update({
        admin_permissions: permissions,
      }).eq('id', userId)
    }

    // Audit log
    await logAdminAction({
      adminId: user.id,
      action: `member.${action}`,
      targetType: 'member',
      targetId: userId,
      details: action === 'update_permissions' ? { permissions } : {},
    })

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
