import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getSlaDeadline } from '@/lib/support/sla'
import { createNotification } from '@/lib/notifications'
import { logAdminAction } from '@/lib/admin/audit-log'
import { getResend } from '@/lib/email/client'
import { SENDERS } from '@/lib/email/senders'

const VALID_STATUSES = ['open', 'in_progress', 'resolved', 'closed']
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent']
const VALID_CATEGORIES = ['general', 'account', 'billing', 'technical', 'content', 'other']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface SupportTicket {
  id: string
  user_id: string
  subject: string
  description: string
  status: string
  priority: string
  category: string
  assigned_to: string | null
  sla_deadline: string
  resolved_at: string | null
  created_at: string
  updated_at: string
}

/**
 * GET /api/support/tickets/[id]
 * Get ticket detail with messages and events
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

    // Fetch ticket
    const { data: ticket, error: ticketError } = await admin
      .from('support_tickets')
      .select('*')
      .eq('id', id)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Verify ownership or admin
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

    // Fetch events
    const { data: events, error: eventsError } = await admin
      .from('support_ticket_events')
      .select('*')
      .eq('ticket_id', id)
      .order('created_at', { ascending: true })

    if (messagesError || eventsError) {
      console.error('Messages/events fetch error:', messagesError || eventsError)
      return NextResponse.json(
        { error: 'Failed to fetch ticket details' },
        { status: 500 }
      )
    }

    // Build profile map for all unique user IDs in messages and events
    const userIds = new Set<string>()
    if (messages) {
      messages.forEach((m: any) => userIds.add(m.user_id))
    }
    if (events) {
      events.forEach((e: any) => userIds.add(e.actor_id))
    }

    let profilesMap: Record<string, any> = {}
    if (userIds.size > 0) {
      const { data: profiles, error: profilesError } = await admin
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', Array.from(userIds))

      if (!profilesError && profiles) {
        profilesMap = profiles.reduce((acc: Record<string, any>, p: any) => {
          acc[p.id] = {
            name: `${p.first_name} ${p.last_name}`.trim(),
            id: p.id,
          }
          return acc
        }, {})
      }
    }

    return NextResponse.json({
      ticket,
      messages: messages || [],
      events: events || [],
      profiles: profilesMap,
    })
  } catch (error) {
    console.error('GET /api/support/tickets/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/support/tickets/[id]
 * Update ticket (admin only)
 */
export async function PATCH(
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

    // Verify admin
    const admin = getSupabaseAdmin()
    const { data: userProfile } = await admin
      .from('profiles')
      .select('is_admin')
      .eq('id', authData.user.id)
      .single()

    if (!userProfile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch current ticket
    const { data: currentTicket, error: ticketError } = await admin
      .from('support_tickets')
      .select('*')
      .eq('id', id)
      .single() as { data: SupportTicket | null; error: any }

    if (ticketError || !currentTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Parse request body
    const body = await request.json()
    const { status, priority, assigned_to, category } = body

    // Validate fields
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return NextResponse.json(
        { error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}` },
        { status: 400 }
      )
    }

    if (category && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 }
      )
    }

    // Build update object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateObj: any = {
      updated_at: new Date().toISOString(),
    }

    if (status !== undefined && status !== currentTicket.status) {
      updateObj.status = status
    }

    if (priority !== undefined && priority !== currentTicket.priority) {
      updateObj.priority = priority
      updateObj.sla_deadline = getSlaDeadline(priority)
    }

    if (assigned_to !== undefined) {
      updateObj.assigned_to = assigned_to
    }

    if (category !== undefined && category !== currentTicket.category) {
      updateObj.category = category
    }

    // Handle resolved_at
    if (status === 'resolved' && !currentTicket.resolved_at) {
      updateObj.resolved_at = new Date().toISOString()
    }

    // Update ticket
    const { data: updatedTicket, error: updateError } = await admin
      .from('support_tickets')
      .update(updateObj)
      .eq('id', id)
      .select()
      .single()

    if (updateError || !updatedTicket) {
      console.error('Ticket update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update ticket' },
        { status: 500 }
      )
    }

    // Add events for state changes
    if (status !== undefined && status !== currentTicket.status) {
      await admin.from('support_ticket_events').insert({
        ticket_id: id,
        actor_id: authData.user.id,
        event_type: 'status_changed',
        details: { from: currentTicket.status, to: status },
      })
    }

    if (priority !== undefined && priority !== currentTicket.priority) {
      await admin.from('support_ticket_events').insert({
        ticket_id: id,
        actor_id: authData.user.id,
        event_type: 'priority_changed',
        details: { from: currentTicket.priority, to: priority },
      })
    }

    if (assigned_to !== undefined && assigned_to !== currentTicket.assigned_to) {
      await admin.from('support_ticket_events').insert({
        ticket_id: id,
        actor_id: authData.user.id,
        event_type: 'assigned',
        details: { assigned_to },
      })

      // Create notification for assigned admin
      if (assigned_to) {
        await createNotification(admin, {
          userId: assigned_to,
          type: 'support_assignment',
          title: 'Ticket assigned to you',
          body: currentTicket.subject,
          link: `/admin/support/${id}`,
          actorId: authData.user.id,
        })
      }
    }

    if (category !== undefined && category !== currentTicket.category) {
      await admin.from('support_ticket_events').insert({
        ticket_id: id,
        actor_id: authData.user.id,
        event_type: 'category_changed',
        details: { from: currentTicket.category, to: category },
      })
    }

    // Log admin action
    await logAdminAction({
      adminId: authData.user.id,
      action: 'update_ticket',
      targetType: 'support_ticket',
      targetId: id,
      details: updateObj,
    })

    // Send email to ticket owner if status changed to resolved/closed
    if ((status === 'resolved' || status === 'closed') && status !== currentTicket.status) {
      try {
        const { data: ownerData } = await admin
          .from('profiles')
          .select('email, first_name')
          .eq('id', currentTicket.user_id)
          .single()

        if (ownerData?.email) {
          const statusLabel = status === 'resolved' ? 'resolved' : 'closed'
          await getResend().emails.send({
            from: SENDERS.hello,
            to: ownerData.email,
            subject: `Your Support Ticket has been ${statusLabel}`,
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
            <p style="font-size:28px;margin:0 0 16px;font-weight:900;color:#f0fdf4;letter-spacing:-1px;">Your ticket is ${statusLabel}</p>
            <p style="font-size:15px;color:#bbf7d0;line-height:1.75;margin:0 0 28px;">Hi ${ownerData.first_name || 'there'},</p>
            <p style="font-size:15px;color:#bbf7d0;line-height:1.75;margin:0 0 28px;">Your support ticket has been ${statusLabel}. You can view the details below.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f2318;border:1px solid #1c3825;border-radius:12px;margin:0 0 32px;">
              <tr>
                <td style="padding:24px 28px;">
                  <p style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#22c55e;margin:0 0 14px;">Ticket Details</p>
                  <p style="font-size:14px;color:#6ee7b7;margin:0 0 8px;"><strong style="color:#f0fdf4;">Reference:</strong> #${id.slice(0, 8)}</p>
                  <p style="font-size:14px;color:#6ee7b7;margin:0 0 8px;"><strong style="color:#f0fdf4;">Subject:</strong> ${currentTicket.subject}</p>
                  <p style="font-size:14px;color:#6ee7b7;margin:0;"><strong style="color:#f0fdf4;">Status:</strong> ${statusLabel}</p>
                </td>
              </tr>
            </table>
            <p style="font-size:14px;color:#bbf7d0;line-height:1.75;margin:0;">Thank you for using AgroYield Network. If you have any further questions, please don't hesitate to reach out.</p>
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
        console.error('Status notification email failed:', emailError)
      }
    }

    return NextResponse.json({ ticket: updatedTicket })
  } catch (error) {
    console.error('PATCH /api/support/tickets/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
