import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { createNotification } from '@/lib/notifications'

// POST /api/notifications — create a notification for another user
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type, postId, postType } = await request.json()

    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get the commenter's name
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single()
    const actorName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : 'Someone'

    if (type === 'comment' && postId && postType) {
      // Look up the post owner based on post type
      const tableMap: Record<string, string> = {
        research: 'research_posts',
        opportunity: 'opportunities',
        listing: 'marketplace_listings',
        price_report: 'price_reports',
      }
      const table = tableMap[postType]
      if (!table) return NextResponse.json({ error: 'Invalid post type' }, { status: 400 })

      const { data: post } = await admin
        .from(table)
        .select('user_id, title')
        .eq('id', postId)
        .single()

      const linkMap: Record<string, string> = {
        research: `/research/${postId}`,
        opportunity: `/opportunities/${postId}`,
        listing: `/marketplace/${postId}`,
        price_report: `/prices`,
      }
      const link = linkMap[postType] || '/'

      // Notify the post author (if it's not the commenter)
      if (post && post.user_id !== user.id) {
        await createNotification(admin, {
          userId:   post.user_id,
          type:     'comment',
          title:    `${actorName} commented on "${post.title}"`,
          link,
          actorId:  user.id,
          entityId: postId,
        })
      }

      // Notify other participants in the thread (excluding commenter + post author)
      if (post) {
        const { data: previousCommenters } = await admin
          .from('comments')
          .select('user_id')
          .eq('post_id', postId)
          .eq('post_type', postType)
          .eq('is_active', true)
          .neq('user_id', user.id)         // exclude the person commenting
          .neq('user_id', post.user_id)    // exclude post author (already notified)

        if (previousCommenters) {
          // Deduplicate user IDs
          const uniqueIds = [...new Set(previousCommenters.map(c => c.user_id))]
          for (const uid of uniqueIds) {
            await createNotification(admin, {
              userId:   uid,
              type:     'comment',
              title:    `${actorName} also commented on "${post.title}"`,
              link,
              actorId:  user.id,
              entityId: postId,
            })
          }
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Notification API error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}