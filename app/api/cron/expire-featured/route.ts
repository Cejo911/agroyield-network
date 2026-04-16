import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { slackAlert } from '@/lib/slack'
import { createNotification } from '@/lib/notifications'

/**
 * GET /api/cron/expire-featured
 *
 * Daily cron — removes featured status from listings whose
 * featured_until has passed. Notifies the listing owner.
 */

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()

  // Find featured listings past their expiry
  const { data: expired, error } = await admin
    .from('marketplace_listings')
    .select('id, user_id, title')
    .eq('is_featured', true)
    .not('featured_until', 'is', null)
    .lte('featured_until', new Date().toISOString())

  if (error) {
    console.error('Expire featured query error:', error.message)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  if (!expired || expired.length === 0) {
    return NextResponse.json({ expired: 0, message: 'No listings to expire' })
  }

  // Batch update — remove featured status
  const ids = expired.map(l => l.id)
  await admin
    .from('marketplace_listings')
    .update({ is_featured: false })
    .in('id', ids)

  // Notify each owner
  for (const listing of expired) {
    createNotification(admin, {
      userId: listing.user_id,
      type: 'system',
      title: 'Featured period ended',
      body: `Your featured listing "${listing.title}" has returned to normal visibility. You can feature it again from the listing page.`,
      link: `/marketplace/${listing.id}`,
      entityId: listing.id,
    })
  }

  slackAlert({
    title: 'Featured Listings Expired',
    level: 'info',
    fields: { 'Expired': expired.length },
  }).catch(() => {})

  return NextResponse.json({ expired: expired.length })
}
