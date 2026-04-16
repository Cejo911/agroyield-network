import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

/**
 * GET /api/admin/marketplace-orders — all marketplace orders + disputes (admin only)
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()

  // Verify admin
  const { data: profile } = await admin
    .from('profiles')
    .select('role, is_admin')
    .eq('id', user.id)
    .single()

  const raw = profile as { role: string; is_admin: boolean } | null
  if (!raw?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [ordersResult, disputesResult] = await Promise.all([
    admin
      .from('marketplace_orders')
      .select('*, marketplace_listings(title)')
      .order('created_at', { ascending: false })
      .limit(500),
    admin
      .from('marketplace_disputes')
      .select('*')
      .order('created_at', { ascending: false }),
  ])

  return NextResponse.json({
    orders: ordersResult.data ?? [],
    disputes: disputesResult.data ?? [],
  })
}
