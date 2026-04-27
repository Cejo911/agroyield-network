import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { sanitiseText } from '@/lib/sanitise'
import { getSlaDeadline } from '@/lib/support/sla'
import { createNotificationBatch } from '@/lib/notifications'
import { slackAlert } from '@/lib/slack'
import { getResend } from '@/lib/email/client'
import { SENDERS } from '@/lib/email/senders'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

const VALID_CATEGORIES = ['general', 'account', 'billing', 'technical', 'content', 'other']
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent']

type SlackLevel = 'info' | 'warning' | 'error'
const PRIORITY_COLORS: Record<string, SlackLevel> = {
  low: 'info',
  medium: 'info',
  high: 'warning',
  urgent: 'error',
}

/**
 * GET /api/support/tickets
 * List user's support tickets
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = getSupabaseAdmin() as SupabaseClient<Database>

    // Fetch tickets for this user
    const { data: tickets, error: ticketsError } = await admin
      .from('support_tickets')
      .select('*')
      .eq('user_id', authData.user.id)
      .order('created_at', { ascending: false })

    if (ticketsError) {
      console.error('Tickets fetch error:', ticketsError.message)
      return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 })
    }

    // Build map of profile names for assigned_to IDs
    const assignedToIds = Array.from(
      new Set(tickets?.map((t) => t.assigned_to).filter(Boolean) as string[] || [])
    )

    let profilesMap: Record<string, string> = {}
    if (assignedToIds.length > 0) {
      const { data: profiles, error: profilesError } = await admin
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', assignedToIds)

      if (!profilesError && profiles) {
        profilesMap = profiles.reduce<Record<string, string>>((acc, p) => {
          acc[p.id] = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim()
          return acc
        }, {})
      }
    }

    // Add assignedName to each ticket
    const enrichedTickets = (tickets || []).map((ticket) => ({
      ...ticket,
      assignedName: ticket.assigned_to ? profilesMap[ticket.assigned_to] : null,
    }))

    return NextResponse.json({ tickets: enrichedTickets })
  } catch (error) {
    console.error('GET /api/support/tickets error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/support/tickets
 * Create a new support ticket
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check token verification
    const admin = getSupabaseAdmin() as SupabaseClient<Database>
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60000).toISOString()
    const { data: tokens, error: tokenError } = await admin
      .from('support_tokens')
      .select('id')
      .eq('user_id', authData.user.id)
      .not('verified_at', 'is', null)
      .gt('verified_at', thirtyMinutesAgo)
      .limit(1)

    if (tokenError || !tokens || tokens.length === 0) {
      return NextResponse.json(
        { error: 'Support verification required' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { subject: rawSubject, description: rawDescription, category, priority } = body

    // Validate and sanitise inputs
    const subject = sanitiseText(rawSubject)
    const description = sanitiseText(rawDescription)

    if (!subject || !description) {
      return NextResponse.json(
        { error: 'Subject and description are required' },
        { status: 400 }
      )
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 }
      )
    }

    if (!VALID_PRIORITIES.includes(priority)) {
      return NextResponse.json(
        { error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}` },
        { status: 400 }
      )
    }

    // Calculate SLA deadline
    const slaDeadline = getSlaDeadline(priority)

    // Insert ticket
    const { data: ticket, error: insertError } = await admin
      .from('support_tickets')
      .insert({
        user_id: authData.user.id,
        subject,
        description,
        category,
        priority,
        sla_deadline: slaDeadline,
        status: 'open',
      })
      .select()
      .single()

    if (insertError || !ticket) {
      console.error('Ticket insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create ticket' },
        { status: 500 }
      )
    }

    // Insert initial event
    await admin.from('support_ticket_events').insert({
      ticket_id: ticket.id,
      actor_id: authData.user.id,
      event_type: 'created',
      details: { category, priority },
    })

    // Create notifications for all admins
    const { data: admins, error: adminsError } = await admin
      .from('profiles')
      .select('id')
      .eq('is_admin', true)

    if (!adminsError && admins && admins.length > 0) {
      const adminIds = admins.map((a) => a.id)
      await createNotificationBatch(admin, adminIds, {
        type: 'support_ticket',
        title: 'New support ticket',
        body: subject,
        link: '/admin',
      })
    }

    // Send Slack alert (fire-and-forget)
    slackAlert({
      title: 'New Support Ticket',
      level: PRIORITY_COLORS[priority],
      fields: {
        Subject: subject,
        Category: category,
        Priority: priority,
        'User ID': authData.user.id,
      },
    }).catch(() => {})

    // Send confirmation email
    try {
      const { data: userData } = await admin
        .from('profiles')
        .select('email, first_name')
        .eq('id', authData.user.id)
        .single()

      if (userData?.email) {
        await getResend().emails.send({
          from: SENDERS.hello,
          to: userData.email,
          subject: `Support Ticket Created - #${ticket.id.slice(0, 8)}`,
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
            <p style="font-size:28px;margin:0 0 16px;font-weight:900;color:#f0fdf4;letter-spacing:-1px;">We received your ticket</p>
            <p style="font-size:15px;color:#bbf7d0;line-height:1.75;margin:0 0 28px;">Hi ${userData.first_name || 'there'},</p>
            <p style="font-size:15px;color:#bbf7d0;line-height:1.75;margin:0 0 28px;">Thank you for reaching out. We've received your support request and our team is looking into it.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f2318;border:1px solid #1c3825;border-radius:12px;margin:0 0 32px;">
              <tr>
                <td style="padding:24px 28px;">
                  <p style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#22c55e;margin:0 0 14px;">Ticket Details</p>
                  <p style="font-size:14px;color:#6ee7b7;margin:0 0 8px;"><strong style="color:#f0fdf4;">Reference:</strong> #${ticket.id.slice(0, 8)}</p>
                  <p style="font-size:14px;color:#6ee7b7;margin:0 0 8px;"><strong style="color:#f0fdf4;">Subject:</strong> ${ticket.subject}</p>
                  <p style="font-size:14px;color:#6ee7b7;margin:0 0 8px;"><strong style="color:#f0fdf4;">Category:</strong> ${ticket.category}</p>
                  <p style="font-size:14px;color:#6ee7b7;margin:0;"><strong style="color:#f0fdf4;">Priority:</strong> ${ticket.priority}</p>
                </td>
              </tr>
            </table>
            <p style="font-size:14px;color:#bbf7d0;line-height:1.75;margin:0;">We'll get back to you as soon as possible. You can track your ticket status in your dashboard.</p>
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
      console.error('Confirmation email failed:', emailError)
    }

    return NextResponse.json({ ticket }, { status: 201 })
  } catch (error) {
    console.error('POST /api/support/tickets error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
