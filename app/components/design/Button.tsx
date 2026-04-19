import Link from 'next/link'
import type { ReactNode } from 'react'

// Design primitive — canonical CTA styles for the app. Two visual variants:
//
// - PrimaryLink    → green 600 background, white text. Used for the main
//                    action on a page (Post research, Report a price,
//                    Become a Mentor, Set up profile, Follow {Business}…).
// - SecondaryLink  → outline button with muted text. Used for the quieter
//                    companion action (e.g. "My Requests" next to
//                    "Become a Mentor" on /mentorship, "Already a member?
//                    Sign in" next to a Follow CTA).
//
// Two sizes:
// - md (default) — px-4 py-2.5. Used in page headers and inline action rows.
// - lg            — px-5 py-2.5. Used in centered hero CTAs (gated empty
//                   states, "Follow this business" callouts, full-page
//                   subscriber gates).
//
// The base classes are exported too so feature components that need the
// same styling on a native <button> (form submits, etc.) can opt in without
// wrapping in a Next <Link>.

type Size = 'md' | 'lg'

const SIZE_CLASS: Record<Size, string> = {
  md: 'px-4 py-2.5',
  lg: 'px-5 py-2.5',
}

const PRIMARY_BASE =
  'inline-flex items-center justify-center bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed'

const SECONDARY_BASE =
  'inline-flex items-center justify-center border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed'

// Back-compat exports — pre-existing call sites assemble class strings via
// these constants; they default to size="md" so existing usages keep working
// even if a future refactor inlines them on a native <button>.
export const PRIMARY_CTA_CLASSES = `${PRIMARY_BASE} ${SIZE_CLASS.md}`
export const SECONDARY_CTA_CLASSES = `${SECONDARY_BASE} ${SIZE_CLASS.md}`

type LinkProps = {
  href: string
  children: ReactNode
  size?: Size
  className?: string
}

export function PrimaryLink({ href, children, size = 'md', className = '' }: LinkProps) {
  return (
    <Link href={href} className={`${PRIMARY_BASE} ${SIZE_CLASS[size]} ${className}`.trim()}>
      {children}
    </Link>
  )
}

export function SecondaryLink({ href, children, size = 'md', className = '' }: LinkProps) {
  return (
    <Link href={href} className={`${SECONDARY_BASE} ${SIZE_CLASS[size]} ${className}`.trim()}>
      {children}
    </Link>
  )
}
