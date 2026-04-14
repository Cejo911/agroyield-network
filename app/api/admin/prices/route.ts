import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAdminAction } from '@/lib/admin/audit-log'

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabaseAny
      .from('profiles').select('is_admin, admin_role, admin_permissions').eq('id', user.id).single()
    const p = profile as Record<string, unknown> | null
    if (!p?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if (p.admin_role !== 'super') {
      const perms = p.admin_permissions as Record<string, boolean> | null
      if (!perms?.prices) return NextResponse.json({ error: 'No permission' }, { status: 403 })
    }

    const { id, action: priceAction } = await request.json() as {
      id: string
      action: 'hide' | 'show' | 'delete'
    }

    if (priceAction === 'hide') {
      await supabaseAny.from('price_reports').update({ is_active: false }).eq('id', id)
    } else if (priceAction === 'show') {
      await supabaseAny.from('price_reports').update({ is_active: true }).eq('id', id)
    } else if (priceAction === 'delete') {
      await supabaseAny.from('price_reports').update({ is_active: false }).eq('id', id)
    }

    await logAdminAction({ adminId: user.id, action: `price.${priceAction}`, targetType: 'price_report', targetId: id })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
