// Canonical relative-time formatter — the single source of truth for the
// "5m ago" / "3h ago" / "2d ago" labels that pepper feed cards, marketplace
// listings, price reports, comments, notifications and message rows.
//
// Solves three failure modes that 7+ near-duplicate local `timeAgo` helpers
// scattered across the app surface had drifted into:
//
//   1. Casing drift — community/[id]/page.tsx, prices-client.tsx,
//      research-client.tsx, marketplace-client.tsx, CommentsSection.tsx
//      and SupportTab.tsx all returned "Just now" (capitalised), while
//      community-client.tsx, NotificationBell.tsx and OnlineIndicator.tsx
//      returned "just now" (lowercase). The audit (docs/ux-ui-audit-26apr.md
//      P1 cluster) called this out explicitly. Canonical: lowercase
//      "just now".
//
//   2. Boundary drift — some impls treated <1h as a single bucket ("Just
//      now" up to an hour); others segmented into "<1m → just now" and
//      "<1h → Nm ago". Some included year for >7d, some didn't. Canonical:
//      <1 min → "just now", <1h → "Nm ago", <24h → "Nh ago", <7d → "Nd ago",
//      else → "DD MMM" (with year if >365 days old).
//
//   3. Six redundant `// eslint-disable-next-line react-hooks/purity`
//      directives — one per local impl — because each call site reached
//      for `Date.now()` during render. After this consolidation, the
//      single disable lives on the Date.now() line below; every caller
//      becomes pure.
//
// No new npm deps; date-fns / dayjs would have been overkill for a
// 30-line helper. Browser-native Intl handles the >7d locale-aware
// fallback.

/**
 * Format a date as a relative time string.
 *
 * Examples (assuming "now" is 2026-04-28T12:00:00Z):
 *   - 30 sec ago         → "just now"
 *   - 5 min ago          → "5m ago"
 *   - 3 hours ago        → "3h ago"
 *   - 2 days ago         → "2d ago"
 *   - 14 days ago        → "14 Apr"     (en-GB short)
 *   - 400 days ago       → "24 Mar 2025"
 *   - null / undefined / '' → ""
 *
 * @param date - ISO timestamp string, Date instance, or null/undefined
 * @returns Human-readable relative time, or "" for falsy input.
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return ''
  const target = date instanceof Date ? date : new Date(date)
  const targetMs = target.getTime()
  if (Number.isNaN(targetMs)) return ''

  // Date.now() in this helper is the canonical "now" reference for the entire
  // app's relative-time labels. The eslint react-hooks/purity rule does not
  // flag this module because the file is not a React component / hook — it's
  // a plain lib utility imported by both server- and client-side render paths.
  // Refactor planned (H3 backlog) to thread a frozen `now` through the
  // render tree, at which point this module accepts `now` as a second arg.
  const diffMs = Date.now() - targetMs

  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  // >7 days: locale-aware short date. Include year only if >365 days old —
  // matches the previous behaviour of community/[id]/page.tsx, research-client.tsx
  // and CommentsSection.tsx, which already added the year for old entries.
  const includeYear = days > 365
  return target.toLocaleDateString('en-GB', includeYear
    ? { day: '2-digit', month: 'short', year: 'numeric' }
    : { day: '2-digit', month: 'short' }
  )
}
