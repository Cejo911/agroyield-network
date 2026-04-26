import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { SENDERS } from '@/lib/email/senders'
import { getResend } from '@/lib/email/client'
import { slackAlert } from '@/lib/slack'
import { logAdminAction } from '@/lib/admin/audit-log'

const REASONS = ['Spam', 'Misleading', 'Inappropriate', 'Duplicate', 'Other']

// Sentinel admin_id for system-actor audit log entries (auto-suspend).
// admin_audit_log.admin_id is NOT NULL with no FK; this lets us distinguish
// system actions from real-admin actions in the audit feed without altering
// the schema.
const SYSTEM_ADMIN_ID = '00000000-0000-0000-0000-000000000000'

// post_type → (table, author column). Used for both populating
// reports.post_author_id at insert time and the auto-hide table dispatch.
// Keeping the map in one place (instead of two parallel switch statements)
// reduces drift if a new post type is added.
const POST_TYPE_META: Record<
  string,
  { table: string; authorCol: string }
> = {
  opportunity:     { table: 'opportunities',        authorCol: 'user_id'     },
  listing:         { table: 'marketplace_listings', authorCol: 'user_id'     },
  community_post:  { table: 'community_posts',      authorCol: 'user_id'     },
  research:        { table: 'research_posts',       authorCol: 'user_id'     },
  price_report:    { table: 'price_reports',        authorCol: 'user_id'     },
  business_review: { table: 'business_reviews',     authorCol: 'reviewer_id' },
}

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
      postType: 'opportunity' | 'listing' | 'research' | 'price_report' | 'business_review' | 'community_post'
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

    // Look up the post's author. Populated into reports.post_author_id at
    // insert time so the auto-suspend threshold check (further down) is a
    // single fast COUNT(DISTINCT user_id) instead of joining against six
    // post-type tables on every report submission.
    //
    // If lookup fails or returns no row, we still insert the report —
    // post_author_id ends up NULL, which excludes it from suspension
    // counts. Better than blocking a legitimate report on a stale post.
    let postAuthorId: string | null = null
    const meta = POST_TYPE_META[postType]
    if (meta) {
      const { data: postRow } = await adminAny
        .from(meta.table)
        .select(`${meta.authorCol}`)
        .eq('id', postId)
        .maybeSingle()
      const candidate = postRow?.[meta.authorCol]
      postAuthorId = typeof candidate === 'string' ? candidate : null
    }

    // Insert report.
    //
    // We DESTRUCTURE the error here. Earlier this call was `await adminAny
    // .from('reports').insert({...})` with no check — when the insert
    // failed silently (RLS edge cases, schema drift, network blip, etc.)
    // the route still returned `{ok: true}` to the client. The user saw
    // "✓ Reported", but no row landed in public.reports and the admin
    // moderation queue stayed empty. Surface the failure now so:
    //   • the dropdown shows the real error to the user
    //   • Vercel logs / Sentry capture the cause
    //   • we don't proceed to threshold checks against a non-existent row
    const { error: insertErr } = await adminAny.from('reports').insert({
      user_id: user.id,
      post_type: postType,
      post_id: postId,
      reason,
      post_author_id: postAuthorId,
    })
    if (insertErr) {
      console.error('[reports] insert failed:', {
        postType,
        postId,
        userId: user.id,
        message: insertErr.message,
        details: (insertErr as Record<string, unknown>).details,
        hint:    (insertErr as Record<string, unknown>).hint,
        code:    (insertErr as Record<string, unknown>).code,
      })
      return NextResponse.json(
        { error: insertErr.message || 'Failed to save report' },
        { status: 500 },
      )
    }

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

    // Auto-hide if threshold reached.
    // Most post types use `is_active: false`; business_reviews uses `published: false`
    // because the table mirrors the product_reviews schema (moderation column).
    // Auto-hide errors are LOGGED but not fatal — the report row already
    // landed (above), so the moderator can still action it from the queue
    // even if the visibility flip didn't take.
    const autoHidden = totalReports >= threshold
    if (autoHidden) {
      if (postType === 'business_review') {
        const { error: hideErr } = await adminAny.from('business_reviews')
          .update({ published: false }).eq('id', postId)
        if (hideErr) console.error('[reports] auto-hide business_review failed:', hideErr)
      } else {
        const table =
          postType === 'opportunity'   ? 'opportunities'
        : postType === 'price_report'  ? 'price_reports'
        : postType === 'research'      ? 'research_posts'
        : postType === 'community_post' ? 'community_posts'
        :                                'marketplace_listings'
        const { error: hideErr } = await adminAny.from(table)
          .update({ is_active: false }).eq('id', postId)
        if (hideErr) console.error(`[reports] auto-hide ${table} failed:`, hideErr)
      }
    }

    // ── AUTO-SUSPEND CHECK ───────────────────────────────────────────
    // Triggered separately from per-post auto-hide. The signal we're
    // counting is "distinct people who have flagged this user across
    // their content" — a real abuse-consensus signal, not just volume.
    //
    // Skip conditions:
    //   • postAuthorId NULL (orphaned/deleted post)            — can't suspend nobody
    //   • author === reporter                                  — paranoia; shouldn't happen
    //   • author is super admin                                — never auto-suspend platform owners
    //   • author already suspended                             — idempotent no-op
    //
    // Threshold: settings.user_suspension_threshold (default 3). Independent
    // from the report_threshold above so content moderation and account
    // consequences can be tuned separately.
    //
    // Reset semantics: we only count reports created AFTER the author's
    // last_suspension_cleared_at. Manual unsuspend stamps that column
    // (see /api/admin/member action='unsuspend'), so an unsuspended user
    // gets a fresh slate without us deleting audit history.
    //
    // Errors here are LOGGED but not fatal — the report row already
    // landed and admins can manually action from the queue.
    if (postAuthorId && postAuthorId !== user.id) {
      try {
        // 1. Suspension threshold setting.
        const { data: thresholdSettingRow } = await adminAny.from('settings')
          .select('value').eq('key', 'user_suspension_threshold').maybeSingle()
        const suspensionThreshold = parseInt(
          (thresholdSettingRow as Record<string, unknown>)?.value as string ?? '3',
          10,
        )

        // 2. Author's current suspension state + clear-marker.
        const { data: authorRow } = await adminAny
          .from('profiles')
          .select('id, is_suspended, admin_role, last_suspension_cleared_at')
          .eq('id', postAuthorId)
          .maybeSingle()

        const author = authorRow as
          | {
              id: string
              is_suspended: boolean | null
              admin_role: string | null
              last_suspension_cleared_at: string | null
            }
          | null

        const eligibleForAutoSuspend =
          !!author &&
          author.is_suspended !== true &&
          author.admin_role !== 'super'

        if (eligibleForAutoSuspend) {
          // 3. Count distinct reporters since the author's last
          //    clear marker. NULL clear marker → count all of history.
          //    We can't do COUNT(DISTINCT user_id) directly through
          //    PostgREST, so pull the distinct user_ids and count in JS.
          //    Bounded by suspensionThreshold-ish rows in the
          //    overwhelming majority of cases, so this is fine.
          let reportsQuery = adminAny
            .from('reports')
            .select('user_id')
            .eq('post_author_id', postAuthorId)
          if (author?.last_suspension_cleared_at) {
            reportsQuery = reportsQuery.gt(
              'created_at',
              author.last_suspension_cleared_at,
            )
          }
          const { data: reporterRows } = await reportsQuery
          const distinctReporters = new Set(
            (reporterRows ?? [])
              .map((r: Record<string, unknown>) => r.user_id)
              .filter((u: unknown): u is string => typeof u === 'string'),
          )

          if (distinctReporters.size >= suspensionThreshold) {
            // 4. Suspend: profile flag + auth ban (matches manual
            //    suspend in /api/admin/member). 87600h is the same
            //    ten-year ban duration the manual flow uses.
            const banClient = createAdminClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY!,
            )
            const { error: profileErr } = await adminAny
              .from('profiles')
              .update({ is_suspended: true })
              .eq('id', postAuthorId)
            if (profileErr) {
              console.error('[reports] auto-suspend profile flag failed:', profileErr)
            }
            try {
              await banClient.auth.admin.updateUserById(postAuthorId, {
                ban_duration: '87600h',
              })
            } catch (banErr) {
              console.error('[reports] auto-suspend auth ban failed:', banErr)
            }

            // 5. Audit log with the system sentinel admin_id so the
            //    feed clearly shows automated vs human moderator
            //    actions. logAdminAction is fire-and-forget internally.
            await logAdminAction({
              adminId: SYSTEM_ADMIN_ID,
              action: 'auto_suspend',
              targetType: 'user',
              targetId: postAuthorId,
              details: {
                reason: 'distinct_reporters_threshold',
                threshold: suspensionThreshold,
                distinct_reporters: distinctReporters.size,
                triggered_by_post_id: postId,
                triggered_by_post_type: postType,
              },
            })

            // 6. Slack alert. Manual suspend doesn't fire one today,
            //    but auto-suspend is unattended so observability matters
            //    more — admins should see this within seconds and be
            //    able to review/unsuspend from the dashboard if it's
            //    a false positive.
            slackAlert({
              title: 'User Auto-Suspended',
              level: 'warning',
              fields: {
                'User ID': postAuthorId,
                'Distinct Reporters': `${distinctReporters.size} (threshold: ${suspensionThreshold})`,
                'Triggered By': `${postType}:${postId}`,
                'Reversal': 'Admin → Members → Unsuspend',
              },
            }).catch(() => {})
          }
        }
      } catch (suspendErr) {
        // Never let a suspension-check failure block the report submission.
        console.error('[reports] auto-suspend check failed:', suspendErr)
      }
    }

    // Fire-and-forget: Slack alert for content report
    const postLabel =
      postType === 'opportunity'     ? 'Opportunity'
    : postType === 'price_report'    ? 'Price Report'
    : postType === 'research'        ? 'Research Post'
    : postType === 'business_review' ? 'Business Review'
    : postType === 'community_post'  ? 'Community Post'
    :                                  'Marketplace Listing'
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
          postType === 'opportunity'     ? `opportunities/${postId}`
        : postType === 'price_report'    ? `prices`
        : postType === 'research'        ? `research/${postId}`
        : postType === 'business_review' ? `admin`
        : postType === 'community_post'  ? `community/${postId}`
        :                                  `marketplace/${postId}`
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
