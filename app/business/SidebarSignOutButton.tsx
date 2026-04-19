'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

/**
 * Sign-out action surface for the Business module. Two variants:
 *
 *   - `variant="sidebar"`  → compact desktop sidebar row styled to match the
 *                            "← All Modules" link (red accent so it reads as
 *                            a destructive/exit action distinct from module
 *                            navigation).
 *   - `variant="sheet"`    → full-width mobile button for the "More" bottom
 *                            sheet. Sits below Appearance.
 *
 * Both variants call the same client-side `supabase.auth.signOut()` flow and
 * redirect to `/`, mirroring `app/dashboard/signout-button.tsx` and
 * `AppNav.tsx` so the logout experience is identical across surfaces.
 *
 * Added 19 Apr 2026 — before this, Business-module users had to navigate
 * back to /dashboard (Back-to-Dashboard in the More sheet, ← All Modules in
 * the desktop sidebar) and open the profile avatar dropdown to sign out.
 * Three clicks for a one-click action on a frequently-used destructive
 * surface was the wrong trade.
 */
export default function SidebarSignOutButton({
  variant = 'sidebar',
  onNavigate,
}: {
  variant?: 'sidebar' | 'sheet'
  /** Optional callback invoked before sign-out fires — used by the mobile
   *  sheet to close itself so the backdrop doesn't linger during the async
   *  signOut() call. */
  onNavigate?: () => void
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  const handleSignOut = async () => {
    if (pending) return
    setPending(true)
    onNavigate?.()
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/')
      router.refresh()
    } catch {
      // Surface a visible failure instead of silent dead-click. Sign-out
      // rarely fails, but network hiccups shouldn't leave the button stuck.
      setPending(false)
    }
  }

  if (variant === 'sheet') {
    return (
      <button
        type="button"
        onClick={handleSignOut}
        disabled={pending}
        className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60 disabled:cursor-not-allowed dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
      >
        <span aria-hidden="true">↪</span>
        <span>{pending ? 'Signing out…' : 'Sign out'}</span>
      </button>
    )
  }

  // Desktop sidebar variant
  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={pending}
      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-left"
    >
      <span aria-hidden="true">↪</span>
      <span>{pending ? 'Signing out…' : 'Sign out'}</span>
    </button>
  )
}
