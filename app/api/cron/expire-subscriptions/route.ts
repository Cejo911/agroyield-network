import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { slackAlert } from '@/lib/slack'

export async function GET(request: Request) {
  // Verify this is called by Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminAny = getSupabaseAdmin() as any

    // Read grace period from settings (default 7 days)
    const { data: setting } = await adminAny
      .from('settings')
      .select('value')
      .eq('key', 'verification_grace_days')
      .single()

    const graceDays = setting?.value ? parseInt(setting.value, 10) : 7

    // Calculate the cutoff: subscriptions that expired more than graceDays ago
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - graceDays)

    // Find verified profiles whose subscription expired before the cutoff
    const { data: expiredProfiles, error: fetchError } = await adminAny
      .from('profiles')
      .select('id, subscription_tier, subscription_expires_at')
      .eq('is_verified', true)
      .lt('subscription_expires_at', cutoff.toISOString())
      .not('subscription_expires_at', 'is', null)

    if (fetchError) throw fetchError

    if (!expiredProfiles || expiredProfiles.length === 0) {
      return NextResponse.json({ success: true, revoked: 0 })
    }

    const ids = expiredProfiles.map((p: any) => p.id)

    // Revoke verified status and reset to free tier
    const { error: updateError } = await adminAny
      .from('profiles')
      .update({
        is_verified: false,
        subscription_tier: 'free',
      })
      .in('id', ids)

    if (updateError) throw updateError

    console.log(`[expire-subscriptions] Revoked ${ids.length} profiles — reset to free tier`)

    // Fire-and-forget: Slack alert for subscription expirations
    if (ids.length > 0) {
      slackAlert({
        title: 'Subscriptions Expired',
        level: 'warning',
        fields: {
          'Profiles Revoked': ids.length,
          'Grace Period': `${graceDays} days`,
          'Action': 'Reset to free tier',
        },
      }).catch(() => {})
    }

    return NextResponse.json({ success: true, revoked: ids.length })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    console.error('[expire-subscriptions]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
