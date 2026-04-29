'use client'

import { forwardRef } from 'react'

// Design primitive — canonical text-input style for the app.
//
// Audit cluster 9 surfaced an `inputClass` constant defined inline in
// 5+ client components (marketplace-client, prices-client,
// research-client, community-client, opportunities-client) with subtle
// drift between sites: text-white vs text-gray-100,
// placeholder-gray-400 vs placeholder-gray-400 dark:placeholder-gray-500,
// rounded-lg px-3 py-2 vs px-4 py-2.5, etc. Centralising stops future
// drift and gives a single place to apply later changes (e.g. the
// audit's deferred 16px-min on mobile to silence iOS auto-zoom — the
// globals.css rule already handles that, but a future spec change
// would land cleanly here).
//
// Three sizes:
//   sm — rounded-lg px-3 py-2 text-sm. Used in dense filter rows.
//   md — rounded-lg px-4 py-2.5 text-sm. The default; matches the
//        biggest-cohort drift target (search bars on listing pages).
//   lg — rounded-lg px-4 py-3 text-base. Used in marquee single-input
//        forms (waitlist signup, contact form) where the input is the
//        page's primary control.
//
// `forwardRef` so callers can attach a ref for focus management
// (autoFocus on mount, scroll-to-error on submit failure, etc.).
// Native input attributes (type, value, onChange, placeholder,
// autoComplete, inputMode, required, name, …) pass through via
// `...rest` so this drops into any existing site without losing
// semantics.

type Size = 'sm' | 'md' | 'lg'

const SIZE_CLASS: Record<Size, string> = {
  sm: 'rounded-lg px-3 py-2 text-sm',
  md: 'rounded-lg px-4 py-2.5 text-sm',
  lg: 'rounded-lg px-4 py-3 text-base',
}

// Single canonical class string. Notable choices:
//   - `dark:text-gray-100` rather than `dark:text-white`. Pure white
//     text on a dark-grey input feels jarringly bright; gray-100 is
//     the same step-down LinkedIn / Notion use.
//   - `placeholder-gray-400 dark:placeholder-gray-500`. Audit cluster 6
//     bumped `text-gray-400` to gray-500 on white surfaces;
//     placeholders stay at the more-muted value because they're
//     decorative-by-convention and benefit from the recede.
//   - `focus:ring-2 focus:ring-green-500` outline matches the
//     marketing-CTA hover state — keeps the brand colour on focus
//     instead of the generic browser-blue ring.
const BASE =
  'w-full border border-gray-300 dark:border-gray-700 ' +
  'bg-white dark:bg-gray-800 ' +
  'text-gray-900 dark:text-gray-100 ' +
  'placeholder-gray-400 dark:placeholder-gray-500 ' +
  'focus:outline-none focus:ring-2 focus:ring-green-500 ' +
  'disabled:opacity-60 disabled:cursor-not-allowed'

type Props = {
  size?: Size
  className?: string
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className' | 'size'>

const TextInput = forwardRef<HTMLInputElement, Props>(function TextInput(
  { size = 'md', className = '', type = 'text', ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      className={`${BASE} ${SIZE_CLASS[size]} ${className}`.trim()}
      {...rest}
    />
  )
})

export default TextInput
