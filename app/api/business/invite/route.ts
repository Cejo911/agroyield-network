import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { createNotification } from '@/lib/notifications'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Service role client to bypass RLS and FK checks on auth.users
    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { business_id, email, role, resend: isResend } = await request.json()

    if (!business_id || !email || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['accountant', 'staff'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Verify the user owns this business
    const { data: business } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('id', business_id)
      .eq('user_id', user.id)
      .single()

    if (!business) {
      return NextResponse.json({ error: 'Business not found or you are not the owner' }, { status: 403 })
    }

    // Can't invite yourself
    if (email.toLowerCase() === user.email?.toLowerCase()) {
      return NextResponse.json({ error: 'You cannot invite yourself' }, { status: 400 })
    }

    let inviteToken: string

    if (isResend) {
      // Re-sending an existing invitation — just fetch the token
      const { data: existing } = await admin
        .from('business_team')
        .select('invite_token, status')
        .eq('business_id', business_id)
        .eq('email', email.toLowerCase())
        .single()

      if (!existing || existing.status !== 'pending') {
        return NextResponse.json({ error: 'No pending invitation found for this email' }, { status: 404 })
      }

      inviteToken = existing.invite_token
    } else {
      // Check for existing invitation
      const { data: existing } = await admin
        .from('business_team')
        .select('id, status')
        .eq('business_id', business_id)
        .eq('email', email.toLowerCase())
        .single()

      if (existing) {
        if (existing.status === 'accepted') {
          return NextResponse.json({ error: 'This person is already a team member' }, { status: 400 })
        }
        if (existing.status === 'pending') {
          return NextResponse.json({ error: 'An invitation is already pending for this email. Use resend.' }, { status: 400 })
        }
        // If revoked, delete old record and create fresh
        if (existing.status === 'revoked') {
          await admin.from('business_team').delete().eq('id', existing.id)
        }
      }

      // Create the invitation using admin client (bypasses FK check on auth.users)
      const { data: invite, error: insertError } = await admin
        .from('business_team')
        .insert({
          business_id,
          invited_by: user.id,
          email: email.toLowerCase(),
          role,
        })
        .select('invite_token')
        .single()

      if (insertError) {
        console.error('Insert error:', insertError)
        return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
      }

      inviteToken = invite.invite_token
    }

    // Get inviter's profile name
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single()

    const inviterName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : 'A business owner'
    const roleLabel = role === 'accountant' ? 'Accountant' : 'Staff'
    const acceptUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://agroyield.africa'}/business/accept-invite?token=${inviteToken}`

    // Send branded invitation email
    await resend.emails.send({
      from: 'AgroYield Network <noreply@agroyield.africa>',
      to: email.toLowerCase(),
      subject: `You've been invited to ${business.name} on AgroYield`,
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
            <p style="font-size:28px;margin:0 0 16px;font-weight:900;color:#f0fdf4;letter-spacing:-1px;">You're invited! 🤝</p>
            <p style="font-size:16px;color:#bbf7d0;line-height:1.75;margin:0 0 28px;">
              <strong style="color:#f0fdf4;">${inviterName}</strong> has invited you to join
              <strong style="color:#f0fdf4;">${business.name}</strong> as ${role === 'accountant' ? 'an' : 'a'}
              <strong style="color:#22c55e;">${roleLabel}</strong> on AgroYield Network's Business Manager.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f2318;border:1px solid #1c3825;border-radius:12px;margin:0 0 32px;">
              <tr>
                <td style="padding:24px 28px;">
                  <p style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#22c55e;margin:0 0 14px;">What you'll be able to do</p>
                  ${role === 'accountant'
                    ? `<p style="font-size:13px;color:#bbf7d0;line-height:1.8;margin:0;">
                        ✅ View all business data<br>
                        ✅ Manage invoices &amp; expenses<br>
                        ✅ Access financial reports<br>
                        ✅ Record payments
                      </p>`
                    : `<p style="font-size:13px;color:#bbf7d0;line-height:1.8;margin:0;">
                        ✅ View business overview<br>
                        ✅ View products &amp; customers<br>
                        ✅ View invoices<br>
                        ❌ Cannot edit financial data
                      </p>`
                  }
                </td>
              </tr>
            </table>
            <a href="${acceptUrl}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:700;color:#030a05;background:linear-gradient(135deg,#22c55e,#16a34a);border-radius:10px;text-decoration:none;">Accept Invitation →</a>
            <p style="font-size:13px;color:#6ee7b7;margin:24px 0 0;">If you don't have an AgroYield account yet, you'll be guided to create one.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 48px;border-top:1px solid #1c3825;">
            <p style="font-size:12px;color:#4b7a5c;margin:0;line-height:1.6;">
              You're receiving this because ${inviterName} invited you to their business on AgroYield Network.<br>
              If you didn't expect this email, you can safely ignore it.<br>
              © 2026 AgroYield Network · Nigeria
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
    })
    
    // Notify the invitee if they already have an AgroYield account
    const { data: inviteeProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()
    if (inviteeProfile) {
      await createNotification(admin, {
        userId:   inviteeProfile.id,
        type:     'team_invite',
        title:    `${inviterName} invited you to join ${business.name}`,
        body:     `You've been invited as ${role === 'accountant' ? 'an Accountant' : 'a Staff member'}`,
        link:     '/business/accept-invite?token=' + inviteToken,
        actorId:  user.id,
        entityId: business_id,
      })
    }
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Invite error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
