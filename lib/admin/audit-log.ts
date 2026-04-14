import { createClient as createAdminClient } from '@supabase/supabase-js'

/**
 * Log an admin action to the audit trail.
 * Uses service role to bypass RLS.
 */
export async function logAdminAction({
  adminId,
  action,
  targetType,
  targetId,
  details = {},
}: {
  adminId: string
  action: string
  targetType: string
  targetId?: string
  details?: Record<string, unknown>
}) {
  try {
    const adminDb = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    await adminDb.from('admin_audit_log').insert({
      admin_id: adminId,
      action,
      target_type: targetType,
      target_id: targetId ?? null,
      details,
    })
  } catch (err) {
    // Fire-and-forget — don't break admin actions if logging fails
    console.error('Audit log failed:', err)
  }
}
