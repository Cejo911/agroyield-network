import { createClient } from '@supabase/supabase-js'
import { createNotification } from '@/lib/notifications'
import { NextResponse } from 'next/server'

/**
 * POST /api/grants/deadline-reminders
 * Sends notifications to users who have active applications for grants
 * with deadlines approaching (within 3 days).
 * Can be called by a cron job (e.g. Vercel Cron) or manually.
 */
export async function POST(req: Request) {
  try {
    // Verify cron secret or admin access
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Find grants with deadlines in the next 3 days
    const now = new Date()
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

    const { data: grants } = await admin
      .from('grants')
      .select('id, title, deadline')
      .eq('status', 'open')
      .gte('deadline', now.toISOString().split('T')[0])
      .lte('deadline', threeDaysLater.toISOString().split('T')[0])

    if (!grants || grants.length === 0) {
      return NextResponse.json({ message: 'No upcoming deadlines', notified: 0 })
    }

    let totalNotified = 0

    for (const grant of grants) {
      // Find users who have draft or submitted applications for this grant
      const { data: applications } = await admin
        .from('grant_applications')
        .select('user_id, status')
        .eq('grant_id', grant.id)
        .in('status', ['draft', 'submitted'])

      if (!applications || applications.length === 0) continue

      const daysLeft = Math.ceil(
        (new Date(grant.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
      const deadlineText = daysLeft === 0
        ? 'today'
        : daysLeft === 1
          ? 'tomorrow'
          : `in ${daysLeft} days`

      for (const app of applications) {
        await createNotification(admin, {
          userId: app.user_id,
          type: 'grant_deadline',
          title: `Grant deadline ${deadlineText}`,
          body: `"${grant.title}" deadline is ${deadlineText}. ${app.status === 'draft' ? 'You haven\'t submitted yet!' : 'Good luck!'}`,
          link: `/grants/${grant.id}`,
          entityId: grant.id,
        })
        totalNotified++
      }
    }

    return NextResponse.json({ message: 'Reminders sent', notified: totalNotified })
  } catch (err) {
    console.error('Deadline reminder error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
