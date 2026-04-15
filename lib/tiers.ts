/**
 * Subscription tier configuration and limit helpers.
 *
 * Single source of truth for what each tier gets.
 * Used by: payment APIs, business module limit checks, pricing page, admin dashboard.
 */

export type TierName = 'free' | 'pro' | 'growth'

export interface TierConfig {
  name: TierName
  label: string
  /** Maximum businesses a user can own (null = unlimited) */
  maxBusinesses: number | null
  /** Maximum invoices per month per business (null = unlimited) */
  maxInvoicesPerMonth: number | null
  /** Maximum team members per business (null = unlimited) */
  maxTeamMembers: number | null
  /** Gets verified badge */
  verifiedBadge: boolean
  /** Full financial reports (P&L, cash flow, etc.) */
  fullReports: boolean
  /** Asset management module */
  assetManagement: boolean
  /** Priority search placement */
  prioritySearch: boolean
  /** Data export (CSV/PDF) */
  dataExport: boolean
}

export const TIERS: Record<TierName, TierConfig> = {
  free: {
    name: 'free',
    label: 'Starter',
    maxBusinesses: 1,
    maxInvoicesPerMonth: 15,
    maxTeamMembers: 3,
    verifiedBadge: false,
    fullReports: false,
    assetManagement: false,
    prioritySearch: false,
    dataExport: false,
  },
  pro: {
    name: 'pro',
    label: 'Pro',
    maxBusinesses: 1,
    maxInvoicesPerMonth: null, // unlimited
    maxTeamMembers: null,      // unlimited
    verifiedBadge: true,
    fullReports: true,
    assetManagement: true,
    prioritySearch: true,
    dataExport: true,
  },
  growth: {
    name: 'growth',
    label: 'Growth',
    maxBusinesses: null, // unlimited (multi-business)
    maxInvoicesPerMonth: null,
    maxTeamMembers: null,
    verifiedBadge: true,
    fullReports: true,
    assetManagement: true,
    prioritySearch: true,
    dataExport: true,
  },
}

/** Default pricing in Naira (overridden by settings table at runtime) */
export const DEFAULT_PRICING: Record<string, number> = {
  tier_pro_monthly: 2000,
  tier_pro_annual: 20000,
  tier_growth_monthly: 5000,
  tier_growth_annual: 50000,
}

/** Free trial duration in days */
export const DEFAULT_FREE_TRIAL_DAYS = 30

/** Features list for pricing page display */
export interface PricingFeature {
  label: string
  free: boolean | string
  pro: boolean | string
  growth: boolean | string
}

export const PRICING_FEATURES: PricingFeature[] = [
  { label: 'Community, Directory, Mentorship', free: true,     pro: true,        growth: true },
  { label: 'Marketplace & Grants',             free: true,     pro: true,        growth: true },
  { label: 'Price Intelligence',               free: true,     pro: true,        growth: true },
  { label: 'Research Hub',                      free: true,     pro: true,        growth: true },
  { label: 'Business Suite',                    free: true,     pro: true,        growth: true },
  { label: 'Invoices per month',               free: '15',     pro: 'Unlimited', growth: 'Unlimited' },
  { label: 'Team members',                     free: '3',      pro: 'Unlimited', growth: 'Unlimited' },
  { label: 'Businesses',                        free: '1',      pro: '1',         growth: 'Unlimited' },
  { label: 'Verified badge',                    free: false,    pro: true,        growth: true },
  { label: 'Full financial reports',            free: false,    pro: true,        growth: true },
  { label: 'Priority search placement',         free: false,    pro: true,        growth: true },
  { label: 'Data export (CSV/PDF)',             free: false,    pro: true,        growth: true },
]

/**
 * Get the effective tier for a user profile.
 * Returns 'free' if subscription has expired.
 */
export function getEffectiveTier(profile: {
  subscription_tier?: string | null
  subscription_expires_at?: string | null
}): TierName {
  const tier = profile.subscription_tier as TierName | null | undefined
  if (!tier || tier === 'free') return 'free'

  // Check expiry — if expired, treat as free
  if (profile.subscription_expires_at) {
    const expires = new Date(profile.subscription_expires_at)
    if (expires <= new Date()) return 'free'
  }

  return tier as TierName
}

/**
 * Check if a user has an active paid subscription (pro or growth).
 * Shorthand for `getEffectiveTier(profile) !== 'free'`.
 */
export function hasTierAccess(profile: {
  subscription_tier?: string | null
  subscription_expires_at?: string | null
}): boolean {
  return getEffectiveTier(profile) !== 'free'
}

/**
 * Get tier limits for a given tier name.
 */
export function getTierLimits(tier: TierName): TierConfig {
  return TIERS[tier] ?? TIERS.free
}

/**
 * Check if a user can perform a tier-gated action.
 * Returns { allowed: true } or { allowed: false, reason, upgradeToTier }.
 */
export function checkTierLimit(
  tier: TierName,
  action: 'create_invoice' | 'create_business' | 'invite_team',
  currentCount: number,
): { allowed: boolean; reason?: string; limit?: number | null; upgradeToTier?: TierName } {
  const config = getTierLimits(tier)

  switch (action) {
    case 'create_invoice': {
      if (config.maxInvoicesPerMonth === null) return { allowed: true }
      if (currentCount >= config.maxInvoicesPerMonth) {
        return {
          allowed: false,
          reason: `You've reached your limit of ${config.maxInvoicesPerMonth} invoices this month`,
          limit: config.maxInvoicesPerMonth,
          upgradeToTier: tier === 'free' ? 'pro' : 'growth',
        }
      }
      return { allowed: true, limit: config.maxInvoicesPerMonth }
    }
    case 'create_business': {
      if (config.maxBusinesses === null) return { allowed: true }
      if (currentCount >= config.maxBusinesses) {
        return {
          allowed: false,
          reason: `Your ${config.label} plan supports up to ${config.maxBusinesses} business${config.maxBusinesses > 1 ? 'es' : ''}`,
          limit: config.maxBusinesses,
          upgradeToTier: tier === 'free' ? 'pro' : 'growth',
        }
      }
      return { allowed: true, limit: config.maxBusinesses }
    }
    case 'invite_team': {
      if (config.maxTeamMembers === null) return { allowed: true }
      if (currentCount >= config.maxTeamMembers) {
        return {
          allowed: false,
          reason: `Your ${config.label} plan supports up to ${config.maxTeamMembers} team members`,
          limit: config.maxTeamMembers,
          upgradeToTier: 'pro',
        }
      }
      return { allowed: true, limit: config.maxTeamMembers }
    }
    default:
      return { allowed: true }
  }
}
