import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// DELETE — dismiss all reports for a post and restore its visibility
export async function DELETE(req: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminAny = adminClient as any
  const { data: profile } = await adminAny
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { postId, postType } = await req.json()
  if (!postId || !postType) return NextResponse.json({ error: 'Missing postId or postType' }, { status: 400 })

  // 1. Delete all reports for this post
  const { error: deleteError } = await adminAny
    .from('reports')
    .delete()
    .eq('post_id', postId)
    .eq('post_type', postType)

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  // 2. Restore post visibility
  const table = postType === 'opportunity' ? 'opportunities' : 'marketplace_listings'
  const { error: restoreError } = await adminAny
    .from(table)
    .update({ is_active: true })
    .eq('id', postId)

  if (restoreError) return NextResponse.json({ error: restoreError.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
