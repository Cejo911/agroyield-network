// Canonical module catalogue.
//
// Audit cluster 9 surfaced label drift between AppNav, the dashboard
// module-cards, and the OnboardingWizard: same module, different name.
// Examples on a single render:
//
//   • AppNav says "Grants" → Dashboard says "Grant Tracker"
//   • AppNav says "Research" → Dashboard says "Research Board"
//   • AppNav says "Business" → Dashboard says "Business Suite"
//
// The user clicks "Business Suite" on the dashboard and lands on a
// page with a top-nav rail labelled "Business" — the cognitive cost
// is small but real, and the drift compounds (every translation, every
// content audit, every help-doc cross-reference has to handle two
// names). This file is the single source of truth for module identity:
// id (slug + URL-safe key), href, shortLabel (for nav rails),
// descriptiveLabel (for module cards + onboarding), description, and
// icon emoji.
//
// Migration: this file ships unused. Subsequent commits replace the
// hard-coded labels in AppNav.tsx, dashboard/page.tsx, and
// OnboardingWizard.tsx with imports from here. Doing the rename
// drift-fix in one shot would touch ~6 files; introducing the
// catalogue now lets future feature work pull from this file even
// before the migration sweep lands.

export type ModuleId =
  | 'dashboard'
  | 'community'
  | 'opportunities'
  | 'grants'
  | 'marketplace'
  | 'prices'
  | 'directory'
  | 'research'
  | 'mentorship'
  | 'business'
  | 'messages'
  | 'profile'

export type Module = {
  id: ModuleId
  href: string
  /**
   * Short label for nav rails (AppNav, BottomTabNav, breadcrumbs).
   * Stays under ~12 characters so it doesn't wrap on a 360-wide phone.
   */
  shortLabel: string
  /**
   * Descriptive label for module cards (dashboard) and the
   * OnboardingWizard. Conveys what the module is for, not just what
   * it's called. "Grant Tracker" > "Grants" when the user is choosing
   * between modules; "Grants" > "Grant Tracker" when they're already
   * inside the app.
   */
  descriptiveLabel: string
  /**
   * One-sentence pitch shown on dashboard module cards and onboarding.
   * Reads like a value prop: what the user gets if they tap in.
   */
  description: string
  /** Emoji icon for module cards. Kept inline with the label everywhere
   *  it appears so a colour-blind / icon-stripped render still works. */
  icon: string
}

export const MODULES: Record<ModuleId, Module> = {
  dashboard: {
    id: 'dashboard',
    href: '/dashboard',
    shortLabel: 'Dashboard',
    descriptiveLabel: 'Dashboard',
    description: 'Your AgroYield home base — every module, one click away.',
    icon: '🏠',
  },
  community: {
    id: 'community',
    href: '/community',
    shortLabel: 'Community',
    descriptiveLabel: 'Community Feed',
    description: 'Discussions, polls and ideas from agripreneurs across Nigeria.',
    icon: '🌍',
  },
  opportunities: {
    id: 'opportunities',
    href: '/opportunities',
    shortLabel: 'Opportunities',
    descriptiveLabel: 'Opportunities',
    description: 'Jobs, fellowships and training programs in agriculture.',
    icon: '🚀',
  },
  grants: {
    id: 'grants',
    href: '/grants',
    shortLabel: 'Grants',
    descriptiveLabel: 'Grant Tracker',
    description: 'Find, track and apply to agricultural grants and funding.',
    icon: '💰',
  },
  marketplace: {
    id: 'marketplace',
    href: '/marketplace',
    shortLabel: 'Marketplace',
    descriptiveLabel: 'Marketplace',
    description: 'Buy and sell agri products, inputs and equipment.',
    icon: '🤝',
  },
  prices: {
    id: 'prices',
    href: '/prices',
    shortLabel: 'Price Tracker',
    descriptiveLabel: 'Price Tracker',
    description: 'Live commodity prices reported by members near you.',
    icon: '🏷️',
  },
  directory: {
    id: 'directory',
    href: '/directory',
    shortLabel: 'Directory',
    descriptiveLabel: 'Directory',
    description: 'Connect with farmers, researchers, agripreneurs and more.',
    icon: '📇',
  },
  research: {
    id: 'research',
    href: '/research',
    shortLabel: 'Research',
    descriptiveLabel: 'Research Board',
    description: 'Share and discover agricultural research from Nigeria.',
    icon: '🔬',
  },
  mentorship: {
    id: 'mentorship',
    href: '/mentorship',
    shortLabel: 'Mentorship',
    descriptiveLabel: 'Mentorship',
    description: 'Find a mentor or become one — across every agri sector.',
    icon: '🧭',
  },
  business: {
    id: 'business',
    href: '/business',
    shortLabel: 'Business',
    descriptiveLabel: 'Business Suite',
    description: 'Invoices, inventory, expenses and reports for your agribusiness.',
    icon: '💼',
  },
  messages: {
    id: 'messages',
    href: '/messages',
    shortLabel: 'Inbox',
    descriptiveLabel: 'Messages',
    description: 'Direct messages with other AgroYield members.',
    icon: '✉️',
  },
  profile: {
    id: 'profile',
    href: '/profile',
    shortLabel: 'Profile',
    descriptiveLabel: 'Your Profile',
    description: 'Manage your AgroYield identity, interests and visibility.',
    icon: '👤',
  },
}

// Canonical orderings. Surfaces should pull from these arrays rather
// than re-listing module ids inline so a future "show Marketplace
// before Community on the home rail" change is a single-file edit.

/**
 * Primary nav rail order — the seven highest-traffic destinations
 * inline on AppNav at `lg+`. Calibrated to AgroYield's own usage:
 * Dashboard is the home shell; Community / Opportunities / Marketplace /
 * Price Tracker are the four highest-traffic content modules; Directory
 * is the people-finder; Business is the SME suite.
 */
export const PRIMARY_NAV_ORDER: ModuleId[] = [
  'dashboard',
  'community',
  'opportunities',
  'marketplace',
  'prices',
  'directory',
  'business',
]

/**
 * Overflow nav rail order — the three lower-frequency modules that
 * collapse under the AppNav "More" dropdown.
 */
export const OVERFLOW_NAV_ORDER: ModuleId[] = ['grants', 'research', 'mentorship']

/**
 * Mobile bottom-tab order — the five thumb-zone destinations on
 * `<md`. Less-frequent surfaces stay reachable via the AppNav
 * hamburger / "More" dropdown so the bottom bar doesn't try to
 * mirror the full nav surface.
 */
export const BOTTOM_TAB_ORDER: ModuleId[] = [
  'dashboard',
  'community',
  'marketplace',
  'messages',
  'profile',
]

/**
 * Onboarding-wizard module-pick order. Excludes Dashboard / Messages /
 * Profile because they're not "modules to opt into" — they're always-
 * present surfaces. Order optimised for a new user's mental model:
 * what's the most exciting thing I can do here first?
 */
export const ONBOARDING_MODULE_ORDER: ModuleId[] = [
  'community',
  'directory',
  'opportunities',
  'prices',
  'marketplace',
  'research',
  'business',
]
