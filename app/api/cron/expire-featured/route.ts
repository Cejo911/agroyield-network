import { runCron, dailyKey } from '@/lib/cron'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { slackAlert } from '@/lib/slack'
import { createNotification } from '@/lib/notifications'

/**
 * GET /api/cron/expire-featured
 *
 * Daily cron — removes featured status from listings whose
 * featured_until has passed. Notifies the listing owner.
 */

export async function GET(request: Request) {
  return runCron(request, {
    jobName: 'expire_featured',
    idempotencyKey: dailyKey(),
    handler: async () => {
      const admin = getSupabaseAdmin()

      // Kill switch — admin can pause feature expirations
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: expireFeaturedSetting } = await (admin as any)
        .from('settings').select('value').eq('key', 'expire_featured_enabled').maybeSingle()
      if (expireFeaturedSetting?.value === 'false') {
        return {
          processedCount: 0,
          metadata: { skipped_reason: 'Expire-featured disabled in admin settings' },
        }
      }

      // Find featured listings past their expiry
      const { data: expired, error } = await admin
        .from('marketplace_listings')
        .select('id, user_id, title')
        .eq('is_featured', true)
        .not('featured_until', 'is', null)
        .lte('featured_until', new Date().toISOString())

      if (error) {
        throw new Error(`Expire featured query error: ${error.message}`)
      }

      if (!expired || expired.length === 0) {
        return {
          processedCount: 0,
          metadata: { message: 'No listings to expire' },
        }
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

      return {
        processedCount: expired.length,
        successCount: expired.length,
      }
    },
  })
}
