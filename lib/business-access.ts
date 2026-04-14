/**
 * Business Access Helpers
 *
 * Determines which business a user can access — either as owner or as an
 * invited team member (accountant/staff). Used by every page in the business
 * module to replace the old `.eq('user_id', user.id)` pattern.
 *
 * Returns: { businessId, businessName, role, isOwner }
 *   - role: 'owner' | 'accountant' | 'staff'
 *   - isOwner: true if the user owns the business (shorthand for role === 'owner')
 *
 * Role permissions:
 *   owner      → full access (create, read, update, delete everything)
 *   accountant → read all, manage invoices/expenses/reports, record payments
 *   staff      → read-only with limited create (e.g. log expenses)
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export interface BusinessAccess {
  businessId: string
  businessName: string
  role: 'owner' | 'accountant' | 'staff'
  isOwner: boolean
  userId: string  // the authenticated user's id
}

/**
 * Get business access for the current user.
 * Works with both server and client Supabase clients.
 *
 * @param preferredBusinessId - Optional. If provided, returns access for this
 *   specific business (used by the business switcher). Falls back to first
 *   owned → first team membership if the preferred business isn't accessible.
 *
 * 1. If preferredBusinessId is set, check ownership then team access for that ID
 * 2. Otherwise, first owned business → first team membership (original behaviour)
 * 3. Returns null if no access found
 */
export async function getBusinessAccess(
  supabase: SupabaseClient,
  userId: string,
  preferredBusinessId?: string | null
): Promise<BusinessAccess | null> {
  // If a specific business is requested, try to resolve it directly
  if (preferredBusinessId) {
    const specific = await resolveBusinessAccess(supabase, userId, preferredBusinessId)
    if (specific) return specific
    // Preferred ID is stale or user lost access — fall through to default
  }

  // Default: first owned business
  const { data: ownedBiz } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('user_id', userId)
    .limit(1)
    .single()

  if (ownedBiz) {
    return {
      businessId: ownedBiz.id,
      businessName: ownedBiz.name || '',
      role: 'owner',
      isOwner: true,
      userId,
    }
  }

  // Fallback: first team membership
  const { data: membership } = await supabase
    .from('business_team')
    .select('business_id, role, businesses(id, name)')
    .eq('user_id', userId)
    .eq('status', 'accepted')
    .limit(1)
    .single()

  if (membership) {
    const biz = membership.businesses as unknown as { id: string; name: string } | null
    return {
      businessId: membership.business_id,
      businessName: biz?.name || '',
      role: membership.role as 'accountant' | 'staff',
      isOwner: false,
      userId,
    }
  }

  return null
}

/**
 * Resolve access for a specific business ID.
 * Returns null if the user doesn't own or belong to this business.
 */
async function resolveBusinessAccess(
  supabase: SupabaseClient,
  userId: string,
  businessId: string
): Promise<BusinessAccess | null> {
  // Owner?
  const { data: owned } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('id', businessId)
    .eq('user_id', userId)
    .single()

  if (owned) {
    return {
      businessId: owned.id,
      businessName: owned.name || '',
      role: 'owner',
      isOwner: true,
      userId,
    }
  }

  // Team member?
  const { data: team } = await supabase
    .from('business_team')
    .select('business_id, role, businesses(id, name)')
    .eq('business_id', businessId)
    .eq('user_id', userId)
    .eq('status', 'accepted')
    .single()

  if (team) {
    const biz = team.businesses as unknown as { id: string; name: string } | null
    return {
      businessId: team.business_id,
      businessName: biz?.name || '',
      role: team.role as 'accountant' | 'staff',
      isOwner: false,
      userId,
    }
  }

  return null
}

/**
 * Get ALL businesses the user can access — owned + team memberships.
 * Used by the business switcher to render the dropdown.
 */
export async function getAllBusinessAccess(
  supabase: SupabaseClient,
  userId: string
): Promise<BusinessAccess[]> {
  const result: BusinessAccess[] = []

  // All owned businesses
  const { data: owned } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  for (const biz of owned ?? []) {
    result.push({
      businessId: biz.id,
      businessName: biz.name || '',
      role: 'owner',
      isOwner: true,
      userId,
    })
  }

  // All team memberships
  const { data: teams } = await supabase
    .from('business_team')
    .select('business_id, role, businesses(id, name)')
    .eq('user_id', userId)
    .eq('status', 'accepted')

  for (const t of teams ?? []) {
    const biz = t.businesses as unknown as { id: string; name: string } | null
    result.push({
      businessId: t.business_id,
      businessName: biz?.name || '',
      role: t.role as 'accountant' | 'staff',
      isOwner: false,
      userId,
    })
  }

  return result
}

/**
 * Permission checks based on role.
 * Use these to conditionally show/hide UI elements and guard mutations.
 */
export function canManageInvoices(role: string): boolean {
  return role === 'owner' || role === 'accountant'
}

export function canManageExpenses(role: string): boolean {
  return role === 'owner' || role === 'accountant'
}

export function canManageProducts(role: string): boolean {
  return role === 'owner'
}

export function canManageCustomers(role: string): boolean {
  return role === 'owner' || role === 'accountant'
}

export function canManageAssets(role: string): boolean {
  return role === 'owner'
}

export function canManageTeam(role: string): boolean {
  return role === 'owner'
}

export function canViewReports(role: string): boolean {
  return role === 'owner' || role === 'accountant'
}

export function canEditSetup(role: string): boolean {
  return role === 'owner'
}
