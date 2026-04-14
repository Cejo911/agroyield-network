/**
 * Moderator permission keys.
 * Super Admins bypass all checks — these only apply to moderators.
 */
export const PERMISSION_KEYS = [
  'opportunities',
  'marketplace',
  'community',
  'research',
  'grants',
  'prices',
  'mentorship',
  'comments',
  'members',
  'reports',
  'notifications',
] as const

export type PermissionKey = (typeof PERMISSION_KEYS)[number]

export type AdminPermissions = Partial<Record<PermissionKey, boolean>>

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  opportunities: 'Opportunities',
  marketplace: 'Marketplace',
  community: 'Community Posts',
  research: 'Research Posts',
  grants: 'Grants & Funding',
  prices: 'Price Reports',
  mentorship: 'Mentorship',
  comments: 'Comments',
  members: 'Members (suspend/unsuspend only)',
  reports: 'Reports',
  notifications: 'Send Notifications',
}

/** Default permissions for new moderators — read-only content tabs */
export const DEFAULT_MODERATOR_PERMISSIONS: AdminPermissions = {
  opportunities: true,
  marketplace: true,
  community: true,
  research: true,
  grants: true,
  prices: true,
  mentorship: false,
  comments: true,
  members: true,
  reports: true,
  notifications: false,
}

/**
 * Check if an admin has permission for a given module.
 * Super Admins always return true.
 */
export function hasPermission(
  adminRole: string | null,
  permissions: AdminPermissions | null,
  key: PermissionKey
): boolean {
  if (adminRole === 'super') return true
  if (!permissions) return false
  return permissions[key] === true
}
