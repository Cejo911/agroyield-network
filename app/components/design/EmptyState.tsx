import type { ReactNode } from 'react'

// Design primitive — the canonical "nothing here yet" / "no results"
// block for any list or board surface in the Tailwind-themed app. Mirrors
// the structure of `BusinessLogo` and `UserAvatar` and solves four
// recurring failure modes that plagued the bespoke empty states scattered
// across community / marketplace / prices / research / grants / opportunities:
//
//   1. Inconsistent icon vocabulary — marketplace shipped `🤝`, prices
//      `📊`, research `🔬`, grants the AgroYield logo, opportunities a
//      bare paragraph. Same logical "no items yet" frame, five different
//      visual treatments. The audit's "world's best" comparison
//      (Notion / Linear) gives every empty state a topic-relevant
//      Heroicon, not an emoji or a brand mark.
//   2. No primary CTA inside the empty block — every existing surface
//      told the user what was missing but none gave them the affordance
//      to fix it ("Post the first listing", "Submit the first price",
//      etc.). Notion's playbook: every empty state has a primary action
//      + an optional tip / secondary path.
//   3. Cramped vertical rhythm — `py-16` with no min-height made the
//      empty block hug the next page chrome on tall viewports. The
//      `min-h-[280px]` floor here gives the block enough breathing room
//      that it reads as a deliberate state, not a render glitch.
//   4. Typography drift — bespoke states mixed `text-4xl` emojis with
//      `font-medium` and `text-sm` body, none of them paired to a real
//      heading element. The primitive renders a real `<h2>` so the page
//      outline is correct for screen readers and a11y audits.
//
// Implementation: a centred flex column. Caller supplies the icon as a
// `ReactNode` (typically an inline Heroicon SVG — the codebase already
// uses inline-SVG paths from heroicons, so the primitive doesn't pull in
// any new dependency). The icon sits inside a fixed 48×48 muted disc so
// every call site lands on the same visual weight regardless of which
// SVG path is supplied.
//
// Out of scope: the marketing surface (home/login/about/privacy) doesn't
// have list views and doesn't need this primitive. Auth-gated full-page
// "sign in to continue" panels are not "empty" states — they're access
// gates and intentionally use the marketing-themed copy.

interface EmptyStateProps {
  /** Icon node — typically an inline Heroicon SVG. Kept brand-agnostic;
   *  do not pass the AgroYield logo here (audit calls that out as too
   *  brand-heavy). */
  icon: ReactNode
  /** Required heading. Renders as a real `<h2>`. */
  title: string
  /** Optional secondary line — context, e.g. "Be the first to list a
   *  product." Capped at `max-w-md` so it stays readable on wide grids. */
  body?: string
  /** Primary CTA — typically a `<PrimaryLink>` from
   *  app/components/design/Button.tsx. Notion-style: every empty state
   *  should ship with one. */
  action?: ReactNode
  /** Secondary CTA, e.g. a "Clear filters" button when the empty state
   *  is the result of an over-restrictive filter combination. */
  secondaryAction?: ReactNode
  /** Extra classes merged onto the outer wrapper. */
  className?: string
}

export default function EmptyState({
  icon,
  title,
  body,
  action,
  secondaryAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`min-h-[280px] flex flex-col items-center justify-center text-center px-4 py-12 ${className}`.trim()}
    >
      {/* Icon disc — fixed 48×48 muted background so every Heroicon
          ships at the same visual weight. `aria-hidden` because the
          heading immediately below carries the semantic meaning. */}
      <div
        aria-hidden="true"
        className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 flex items-center justify-center mb-4"
      >
        {icon}
      </div>

      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        {title}
      </h2>

      {body && (
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mt-1">
          {body}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  )
}
