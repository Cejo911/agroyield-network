import { SupabaseClient } from '@supabase/supabase-js'

interface CreateNotificationParams {
  userId: string        // Who receives the notification
  type: string          // 'invoice_paid' | 'team_invite' | 'comment' | 'follow' | 'overdue' | 'system'
  title: string         // Short headline
  body?: string         // Optional detail
  link?: string         // Where to navigate
  actorId?: string      // Who triggered it (e.g. the person who commented)
  entityId?: string     // Related entity (e.g. invoice id)
}

/**
 * Insert a notification. Use with the service-role (admin) client
 * so RLS doesn't block inserts for other users.
 */
export async function createNotification(
  supabase: SupabaseClient,
  params: CreateNotificationParams
) {
  const { error } = await supabase.from('notifications').insert({
    user_id:   params.userId,
    type:      params.type,
    title:     params.title,
    body:      params.body || null,
    link:      params.link || null,
    actor_id:  params.actorId || null,
    entity_id: params.entityId || null,
  })
  if (error) console.error('Notification insert failed:', error.message)
}

/**
 * Insert notifications for multiple users (e.g. all team members).
 */
export async function createNotificationBatch(
  supabase: SupabaseClient,
  userIds: string[],
  params: Omit<CreateNotificationParams, 'userId'>
) {
  const rows = userIds.map(uid => ({
    user_id:   uid,
    type:      params.type,
    title:     params.title,
    body:      params.body || null,
    link:      params.link || null,
    actor_id:  params.actorId || null,
    entity_id: params.entityId || null,
  }))
  const { error } = await supabase.from('notifications').insert(rows)
  if (error) console.error('Batch notification insert failed:', error.message)
}