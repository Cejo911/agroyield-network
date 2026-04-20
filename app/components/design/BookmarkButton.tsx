'use client'

import { useState, useTransition } from 'react'

/**
 * BookmarkButton — polymorphic save/unsave primitive.
 *
 * Used on Opportunities, Marketplace, Grants (+ Research, Businesses in
 * future). The single primitive keeps the visual language consistent and
 * centralises the POST/DELETE wire protocol — if the server contract ever
 * changes we fix it in one place instead of 6 surfaces.
 *
 * Usage:
 *   <BookmarkButton
 *     contentType="opportunity"
 *     contentId={opp.id}
 *     initiallySaved={savedSet.has(opp.id)}
 *   />
 *
 * The parent page is responsible for fetching the user's current saves of
 * the relevant type and passing `initiallySaved` so the first render is
 * correct — no loading flicker on card grids.
 */

export type SaveableContentType =
  | 'opportunity'
  | 'grant'
  | 'marketplace_listing'
  | 'research'
  | 'business'

type Size = 'sm' | 'md'

type Props = {
  contentType: SaveableContentType
  contentId: string
  initiallySaved?: boolean
  size?: Size
  className?: string
  /** If true, the button stops Link-click propagation — set when the button sits inside a card-level <Link>. */
  stopPropagation?: boolean
  /** Optional callback after a successful toggle (for parent-state sync). */
  onToggle?: (saved: boolean) => void
}

const SIZE_MAP: Record<Size, { box: string; icon: string }> = {
  sm: { box: 'w-8 h-8',  icon: 'w-4 h-4' },
  md: { box: 'w-9 h-9',  icon: 'w-5 h-5' },
}

export default function BookmarkButton({
  contentType,
  contentId,
  initiallySaved = false,
  size = 'sm',
  className = '',
  stopPropagation = false,
  onToggle,
}: Props) {
  const [saved, setSaved]     = useState(initiallySaved)
  const [pending, startTx]    = useTransition()
  const [error,  setError]    = useState<string | null>(null)

  const sz = SIZE_MAP[size]

  const toggle = (e: React.MouseEvent) => {
    if (stopPropagation) {
      e.preventDefault()
      e.stopPropagation()
    }
    const next = !saved
    setSaved(next)
    setError(null)
    startTx(async () => {
      try {
        const res = await fetch('/api/saves', {
          method:  next ? 'POST' : 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ content_type: contentType, content_id: contentId }),
        })
        if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Save failed')
        onToggle?.(next)
      } catch (err: unknown) {
        // Revert optimistic update on failure so state matches server truth.
        setSaved(!next)
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from saved' : 'Save for later'}
      title={error ?? (saved ? 'Remove from saved' : 'Save for later')}
      className={`${sz.box} inline-flex items-center justify-center rounded-full border transition-colors disabled:opacity-60
        ${saved
          ? 'bg-green-600 border-green-600 text-white hover:bg-green-700'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-green-400 hover:text-green-600'
        } ${className}`}
    >
      {/* Bookmark icon (filled vs. outline driven by the `saved` boolean). */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={sz.icon}
        aria-hidden="true"
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  )
}
