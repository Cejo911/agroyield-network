import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { logAdminAction } from '@/lib/admin/audit-log'

export async function DELETE(req: Request) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = getSupabaseAdmin() as any
  const { data: profile } = await adminAny
    .from('profiles')
    .select('is_admin, admin_role, admin_permissions')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Permission check for moderators
  if (profile.admin_role !== 'super') {
    const perms = profile.admin_permissions as Record<string, boolean> | null
    if (!perms?.reports) return NextResponse.json({ error: 'No permission' }, { status: 403 })
  }

  const { postId, postType } = await req.json()
  if (!postId || !postType) return NextResponse.json({ error: 'Missing postId or postType' }, { status: 400 })

  // Delete all reports for this post
  const { error: deleteError } = await adminAny
    .from('reports')
    .delete()
    .eq('post_id', postId)
    .eq('post_type', postType)

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  // Restore post visibility
  const table = postType === 'opportunity' ? 'opportunities' : 'marketplace_listings'
  const { error: restoreError } = await adminAny
    .from(table)
    .update({ is_active: true })
    .eq('id', postId)

  if (restoreError) return NextResponse.json({ error: restoreError.message }, { status: 500 })

  await logAdminAction({ adminId: user.id, action: 'reports.dismiss', targetType: postType, targetId: postId })

  return NextResponse.json({ ok: true })
}
