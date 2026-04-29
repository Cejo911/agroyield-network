import type { ReactNode } from 'react'

// Design primitive — canonical filter-pill button used across the
// listing-style modules (marketplace, prices, research, community,
// opportunities). Audit cluster 9 surfaced 4 separate definitions
// of essentially this same Tailwind string with subtle drift —
// e.g. community used `px-3 py-1.5` while marketplace/prices/research
// used `px-4 py-1.5`. Centralising prevents future drift.
//
// Visual: rounded-full pill with a 1px border. Active = green-600 fill
// with white text; inactive = neutral border + muted text with a green
// hover. Mirrors the semantics of `aria-pressed`, which is set
// automatically based on `active` so screen readers announce the
// pressed/not-pressed state correctly without each call site having
// to remember.

type Size = 'sm' | 'md'

const SIZE_CLASS: Record<Size, string> = {
  // sm = the variant community-client uses; tighter for high-density
  // filter rows where 6+ pills sit in a horizontal scroller.
  sm: 'px-3 py-1.5',
  md: 'px-4 py-1.5',
}

const BASE =
  'rounded-full text-sm font-medium border transition-colors disabled:opacity-60 disabled:cursor-not-allowed'

const ACTIVE = 'bg-green-600 text-white border-green-600'

const INACTIVE =
  'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-green-400 dark:hover:border-green-500'

type Props = {
  active: boolean
  onClick: () => void
  children: ReactNode
  size?: Size
  className?: string
  disabled?: boolean
  /**
   * Optional override for the screen-reader label. Defaults to the
   * children's text content via React's standard implicit labelling
   * — useful when the visible label is just an icon + count (e.g.
   * "Open (12)") and you want the SR announcement to read the full
   * filter name.
   */
  ariaLabel?: string
}

export default function FilterPill({
  active,
  onClick,
  children,
  size = 'md',
  className = '',
  disabled = false,
  ariaLabel,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      disabled={disabled}
      className={`${BASE} ${SIZE_CLASS[size]} ${active ? ACTIVE : INACTIVE} ${className}`.trim()}
    >
      {children}
    </button>
  )
}
