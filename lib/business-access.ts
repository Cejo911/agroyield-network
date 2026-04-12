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
 * 1. First checks if the user owns a business
 * 2. If not, checks if they're an accepted team member
 * 3. Returns null if no access found
 */
export async function getBusinessAccess(
  supabase: SupabaseClient,
  userId: string
): Promise<BusinessAccess | null> {
  // Check ownership first (most common case)
  const { data: ownedBiz } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('user_id', userId)
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

  // Check team membership
  const { data: membership } = await supabase
    .from('business_team')
    .select('business_id, role, businesses(id, name)')
    .eq('user_id', userId)
    .eq('status', 'accepted')
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
