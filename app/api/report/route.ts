import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { SENDERS } from '@/lib/email/senders'
import { getResend } from '@/lib/email/client'
import { slackAlert } from '@/lib/slack'

const REASONS = ['Spam', 'Misleading', 'Inappropriate', 'Duplicate', 'Other']

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const postId   = searchParams.get('postId')
    const postType = searchParams.get('postType')
    if (!postId || !postType) return NextResponse.json({ reported: false })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ reported: false })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminAny = getAdminClient() as any
    const { data } = await adminAny.from('reports').select('id')
      .eq('user_id', user.id)
      .eq('post_type', postType)
      .eq('post_id', postId)
      .maybeSingle()

    return NextResponse.json({ reported: !!data })
  } catch {
    return NextResponse.json({ reported: false })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { postId, postType, reason } = await request.json() as {
      postId:   string
      postType: 'opportunity' | 'listing' | 'research' | 'price_report'
      reason:   string
    }

    if (!REASONS.includes(reason)) {
      return NextResponse.json({ error: 'Invalid reason' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminAny = getAdminClient() as any

    // Check already reported
    const { data: existing } = await adminAny.from('reports').select('id')
      .eq('user_id', user.id).eq('post_type', postType).eq('post_id', postId)
      .maybeSingle()
    if (existing) {
      return NextResponse.json({ error: 'You have already reported this post' }, { status: 409 })
    }

    // Insert report
    await adminAny.from('reports').insert({
      user_id: user.id, post_type: postType, post_id: postId, reason,
    })

    // Read report threshold
    const { data: thresholdRow } = await adminAny.from('settings')
      .select('value').eq('key', 'report_threshold').single()
    const threshold = parseInt(
      (thresholdRow as Record<string, unknown>)?.value as string ?? '3', 10
    )

    // Count total reports on this post
    const { count } = await adminAny.from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('post_type', postType).eq('post_id', postId)

    const totalReports = count ?? 0

    // Auto-hide if threshold reached
    const autoHidden = totalReports >= threshold
    if (autoHidden) {
      const table =
        postType === 'opportunity'  ? 'opportunities'
      : postType === 'price_report' ? 'price_reports'
      : postType === 'research'     ? 'research_posts'
      :                               'marketplace_listings'
      await adminAny.from(table).update({ is_active: false }).eq('id', postId)
    }

    // Fire-and-forget: Slack alert for content report
    const postLabel =
      postType === 'opportunity'  ? 'Opportunity'
    : postType === 'price_report' ? 'Price Report'
    : postType === 'research'     ? 'Research Post'
    :                               'Marketplace Listing'
    slackAlert({
      title: autoHidden ? 'Content Auto-Hidden' : 'New Content Report',
      level: autoHidden ? 'warning' : 'info',
      fields: {
        'Content Type': postLabel,
        'Reason': reason,
        'Total Reports': `${totalReports} / ${threshold} threshold`,
        'Status': autoHidden ? '⚠️ Auto-hidden' : 'Visible',
        'Post ID': postId,
      },
    }).catch(() => {})

    // Send admin notification email (fire-and-forget, never blocks the response)
    try {
      const { data: emailSetting } = await adminAny.from('settings')
        .select('value').eq('key', 'admin_notification_email').maybeSingle()
      const rawEmails =
        (emailSetting as Record<string, unknown> | null)?.value as string | undefined
      // Support comma-separated list of emails
      const notificationEmails = rawEmails
        ? rawEmails.split(',').map(e => e.trim()).filter(e => e.length > 0)
        : []

      if (notificationEmails.length > 0) {
        const postPath =
          postType === 'opportunity'  ? `opportunities/${postId}`
        : postType === 'price_report' ? `prices`
        : postType === 'research'     ? `research/${postId}`
        :                               `marketplace/${postId}`
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://agroyield.africa'

        await getResend().emails.send({
          from: SENDERS.noreply,
          to: notificationEmails,
          subject: autoHidden
            ? `⚠️ Post auto-hidden after ${totalReports} reports — AgroYield`
            : `New report submitted — AgroYield`,
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;">
              <h2 style="color:#166534;">AgroYield Network — Report Alert</h2>

              <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
                <tr>
                  <td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;width:40%;">Content type</td>
                  <td style="padding:8px;border:1px solid #e5e7eb;">${postLabel}</td>
                </tr>
                <tr>
                  <td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">Reason</td>
                  <td style="padding:8px;border:1px solid #e5e7eb;">${reason}</td>
                </tr>
                <tr>
                  <td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">Total reports</td>
                  <td style="padding:8px;border:1px solid #e5e7eb;">${totalReports} of ${threshold} threshold</td>
                </tr>
                <tr>
                  <td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">Status</td>
                  <td style="padding:8px;border:1px solid #e5e7eb;">
                    ${autoHidden
                      ? '<span style="color:#dc2626;font-weight:600;">⚠️ Auto-hidden — threshold reached</span>'
                      : '<span style="color:#16a34a;">Visible — below threshold</span>'}
                  </td>
                </tr>
              </table>

              <div style="display:flex;gap:12px;margin-top:20px;">
                <a href="${baseUrl}/${postPath}"
                   style="background:#166534;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;">
                  View Post
                </a>
                <a href="${baseUrl}/admin"
                   style="background:#f3f4f6;color:#111;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;">
                  Open Admin Dashboard
                </a>
              </div>

              <p style="color:#6b7280;font-size:12px;margin-top:24px;">
                You are receiving this because an admin notification email is configured on AgroYield Network.
              </p>
            </div>
          `,
        })
      }
    } catch (emailErr) {
      // Never let email failure affect the report response
      console.error('[reports] Notification email failed:', emailErr)
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
