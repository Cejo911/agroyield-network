import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { sanitiseText } from '@/lib/sanitise'
import { createNotification } from '@/lib/notifications'
import { slackAlert } from '@/lib/slack'
import { getResend } from '@/lib/email/client'
import { SENDERS } from '@/lib/email/senders'

/**
 * GET /api/support/tickets/[id]/messages
 * List messages for a ticket
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = getSupabaseAdmin()

    // Verify ticket ownership or admin
    const { data: ticket, error: ticketError } = await admin
      .from('support_tickets')
      .select('user_id')
      .eq('id', id)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    const { data: userProfile } = await admin
      .from('profiles')
      .select('is_admin')
      .eq('id', authData.user.id)
      .single()

    const isAdmin = userProfile?.is_admin || false
    const isOwner = ticket.user_id === authData.user.id

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch messages
    const { data: messages, error: messagesError } = await admin
      .from('support_ticket_messages')
      .select('*')
      .eq('ticket_id', id)
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('Messages fetch error:', messagesError.message)
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      )
    }

    return NextResponse.json({ messages: messages || [] })
  } catch (error) {
    console.error('GET /api/support/tickets/[id]/messages error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/support/tickets/[id]/messages
 * Add a message to a ticket
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { message: rawMessage } = body

    // Sanitise message
    const cleanMessage = sanitiseText(rawMessage)

    if (!cleanMessage) {
      return NextResponse.json(
        { error: 'Message cannot be empty' },
        { status: 400 }
      )
    }

    const admin = getSupabaseAdmin()

    // Verify ticket ownership or admin and get ticket details
    const { data: ticket, error: ticketError } = await admin
      .from('support_tickets')
      .select('*')
      .eq('id', id)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    const { data: userProfile } = await admin
      .from('profiles')
      .select('is_admin')
      .eq('id', authData.user.id)
      .single()

    const isAdmin = userProfile?.is_admin || false
    const isOwner = ticket.user_id === authData.user.id

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Insert message
    const { data: message, error: insertError } = await admin
      .from('support_ticket_messages')
      .insert({
        ticket_id: id,
        user_id: authData.user.id,
        message: cleanMessage,
        is_admin: isAdmin,
      })
      .select()
      .single()

    if (insertError || !message) {
      console.error('Message insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to add message' },
        { status: 500 }
      )
    }

    // Add event
    await admin.from('support_ticket_events').insert({
      ticket_id: id,
      actor_id: authData.user.id,
      event_type: isAdmin ? 'admin_reply' : 'user_reply',
      details: { message_id: message.id },
    })

    // If admin replying: update ticket status to in_progress if currently open
    if (isAdmin && ticket.status === 'open') {
      await admin
        .from('support_tickets')
        .update({
          status: 'in_progress',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
    }

    // Send appropriate notifications and emails
    if (isAdmin) {
      // Admin replied: send email and notification to ticket owner
      try {
        const { data: ownerData } = await admin
          .from('profiles')
          .select('email, first_name')
          .eq('id', ticket.user_id)
          .single()

        if (ownerData?.email) {
          await getResend().emails.send({
            from: SENDERS.hello,
            to: ownerData.email,
            subject: `New reply to your support ticket - #${id.slice(0, 8)}`,
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
            <p style="font-size:28px;margin:0 0 16px;font-weight:900;color:#f0fdf4;letter-spacing:-1px;">We replied to your ticket</p>
            <p style="font-size:15px;color:#bbf7d0;line-height:1.75;margin:0 0 28px;">Hi ${ownerData.first_name || 'there'},</p>
            <p style="font-size:15px;color:#bbf7d0;line-height:1.75;margin:0 0 28px;">Our support team has replied to your ticket. Check your dashboard to view the response.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f2318;border:1px solid #1c3825;border-radius:12px;margin:0 0 32px;">
              <tr>
                <td style="padding:24px 28px;">
                  <p style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#22c55e;margin:0 0 14px;">Ticket Details</p>
                  <p style="font-size:14px;color:#6ee7b7;margin:0 0 8px;"><strong style="color:#f0fdf4;">Reference:</strong> #${id.slice(0, 8)}</p>
                  <p style="font-size:14px;color:#6ee7b7;margin:0;"><strong style="color:#f0fdf4;">Subject:</strong> ${ticket.subject}</p>
                </td>
              </tr>
            </table>
            <p style="font-size:14px;color:#bbf7d0;line-height:1.75;margin:0;">Please reply directly in your dashboard to continue the conversation.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 48px;border-top:1px solid #1c3825;">
            <p style="font-size:12px;color:#4b7a5c;margin:0;">© 2026 AgroYield Network · Nigeria</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
          })
        }
      } catch (emailError) {
        console.error('Admin reply email failed:', emailError)
      }

      // Create notification for ticket owner
      await createNotification(admin, {
        userId: ticket.user_id,
        type: 'support_reply',
        title: 'New reply to your support ticket',
        body: ticket.subject,
        link: `/support/tickets/${id}`,
        actorId: authData.user.id,
      })
    } else {
      // User replied: send Slack alert
      slackAlert({
        title: 'New User Reply in Support Ticket',
        level: 'info',
        fields: {
          Subject: ticket.subject,
          'Ticket ID': id.slice(0, 8),
          'User ID': authData.user.id,
        },
      }).catch(() => {})
    }

    return NextResponse.json({ message }, { status: 201 })
  } catch (error) {
    console.error('POST /api/support/tickets/[id]/messages error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
