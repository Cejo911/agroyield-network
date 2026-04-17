import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { logAdminAction } from '@/lib/admin/audit-log'
import { checkSlugAvailability, isValidSlugFormat } from '@/lib/slug'

/**
 * Admin: rename business slug and/or toggle is_public kill switch.
 *
 * Super admin only — slug changes affect public URLs, SEO, shared links.
 *
 * Body shape (both fields optional, at least one required):
 *   { slug?: string, isPublic?: boolean }
 *
 * Slug rename behavior:
 *   1. Validate format + reserved + collision
 *   2. Insert current slug into business_slug_aliases (301 redirect source)
 *   3. Update businesses.slug to new value
 *   4. Audit log
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: businessId } = await params
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabaseAny
      .from('profiles').select('is_admin, admin_role').eq('id', user.id).single()
    const p = profile as Record<string, unknown> | null
    if (!p?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    // Super-only: slug changes affect public URLs, shared links, SEO
    if (p.admin_role !== 'super') {
      return NextResponse.json({ error: 'Super admin only' }, { status: 403 })
    }

    const body = (await request.json()) as { slug?: string; isPublic?: boolean }
    const { slug: newSlug, isPublic } = body

    if (newSlug === undefined && isPublic === undefined) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    // Service role for writes (RLS-bypass is acceptable — admin verified above)
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminAny = admin as any

    // Fetch current business
    const { data: current } = await adminAny
      .from('businesses').select('id, name, slug, is_public').eq('id', businessId).single()
    if (!current) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

    const updateData: Record<string, unknown> = {}
    const auditDetails: Record<string, unknown> = { businessName: current.name }

    // --- Slug rename ---
    if (typeof newSlug === 'string' && newSlug !== current.slug) {
      const normalised = newSlug.trim().toLowerCase()

      if (!isValidSlugFormat(normalised)) {
        return NextResponse.json(
          { error: 'Invalid slug format (lowercase letters, numbers, hyphens; 2–40 chars)' },
          { status: 400 }
        )
      }

      const availability = await checkSlugAvailability(normalised, businessId)
      if (!availability.available) {
        return NextResponse.json({ error: availability.reason || 'Slug unavailable' }, { status: 409 })
      }

      // Archive current slug as alias for 301 redirect (unless already an alias for this business).
      // Skip if new slug equals an existing alias for THIS business (i.e., reverting) —
      // in that case just delete the alias so we don't collide on old_slug unique index.
      const { data: existingAlias } = await adminAny
        .from('business_slug_aliases')
        .select('id')
        .eq('old_slug', normalised)
        .eq('business_id', businessId)
        .maybeSingle()
      if (existingAlias) {
        await adminAny.from('business_slug_aliases').delete().eq('id', existingAlias.id)
      }

      // Write the current slug into aliases (so old links keep working)
      const { error: aliasErr } = await adminAny
        .from('business_slug_aliases')
        .insert({ business_id: businessId, old_slug: current.slug })
      // If the old slug was already aliased for this business (e.g., from a previous rename
      // that got rolled back), ignore the unique violation.
      if (aliasErr && !String(aliasErr.message || '').includes('duplicate key')) {
        throw aliasErr
      }

      updateData.slug = normalised
      auditDetails.oldSlug = current.slug
      auditDetails.newSlug = normalised
    }

    // --- is_public toggle ---
    if (typeof isPublic === 'boolean' && isPublic !== current.is_public) {
      updateData.is_public = isPublic
      auditDetails.oldIsPublic = current.is_public
      auditDetails.newIsPublic = isPublic
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: true, noChange: true })
    }

    const { error: updateErr } = await adminAny
      .from('businesses')
      .update(updateData)
      .eq('id', businessId)
    if (updateErr) throw updateErr

    // Audit — separate actions for slug rename vs visibility toggle
    if ('slug' in updateData) {
      await logAdminAction({
        adminId: user.id,
        action: 'business.rename_slug',
        targetType: 'business',
        targetId: businessId,
        details: auditDetails,
      })
    }
    if ('is_public' in updateData) {
      await logAdminAction({
        adminId: user.id,
        action: isPublic ? 'business.publish' : 'business.unpublish',
        targetType: 'business',
        targetId: businessId,
        details: auditDetails,
      })
    }

    return NextResponse.json({ success: true, ...updateData })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
