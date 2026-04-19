'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ThemeToggle from '@/app/components/ThemeToggle'

// Primary tabs pinned to the bottom bar — the 5 most-used business surfaces.
const NAV_ITEMS = [
  { href: '/business',          label: 'Home',     icon: '🏠' },
  { href: '/business/products', label: 'Products', icon: '📦' },
  { href: '/business/invoices', label: 'Invoices', icon: '🧾' },
  { href: '/business/expenses', label: 'Expenses', icon: '💸' },
  { href: '/business/assets',   label: 'Assets',   icon: '🏗️' },
]

// Secondary tabs — reached via the "⋯ More" sheet to keep the bottom bar
// uncluttered while still reachable on mobile.
const MORE_ITEMS = [
  { href: '/business/setup',     label: 'Setup',     icon: '⚙️' },
  { href: '/business/customers', label: 'Customers', icon: '👥' },
  { href: '/business/reports',   label: 'Reports',   icon: '📊' },
  { href: '/business/team',      label: 'Team',      icon: '🧑‍🤝‍🧑' },
]

export default function MobileNav() {
  const pathname = usePathname()
  const [sheetOpen, setSheetOpen] = useState(false)

  // Body scroll-lock while the sheet is open so the backdrop doesn't scroll.
  useEffect(() => {
    if (sheetOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [sheetOpen])

  // Link inside the sheet — closes the sheet on tap so it doesn't linger on
  // top of the next page. (Navigating to /dashboard unmounts this layout
  // anyway, but the secondary /business/* links stay mounted.)
  const closeOnClick = () => setSheetOpen(false)

  const isActive = (href: string) =>
    href === '/business' ? pathname === '/business' : pathname.startsWith(href)

  // Highlight the More pill when the user is currently on one of the
  // secondary routes — gives a visual cue that their page lives in the sheet.
  const moreActive = MORE_ITEMS.some(item => pathname.startsWith(item.href))

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 lg:hidden z-50"
        aria-label="Business module mobile navigation"
      >
        <div className="flex items-center justify-around px-2 py-1.5 max-w-lg mx-auto">
          {NAV_ITEMS.map(item => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[11px] min-w-[56px] transition-colors ${
                  active
                    ? 'text-green-700 dark:text-green-400 font-semibold'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <span className="text-lg leading-none">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-expanded={sheetOpen}
            aria-controls="business-mobile-more-sheet"
            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[11px] min-w-[56px] transition-colors ${
              moreActive
                ? 'text-green-700 dark:text-green-400 font-semibold'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <span className="text-lg leading-none">⋯</span>
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* "More" bottom sheet — hosts the secondary business tabs, the theme */}
      {/* toggle, and a prominent exit back to the main /dashboard.           */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-[60] lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="business-mobile-more-title"
          id="business-mobile-more-sheet"
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setSheetOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Sheet panel */}
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-2xl pb-[env(safe-area-inset-bottom)]">
            {/* Grab handle */}
            <div className="flex justify-center pt-2">
              <div className="h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-700" />
            </div>

            <div className="px-4 pt-3 pb-5">
              <div className="flex items-center justify-between mb-3">
                <h2 id="business-mobile-more-title" className="text-sm font-semibold text-gray-900 dark:text-white">
                  More
                </h2>
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  Close
                </button>
              </div>

              {/* Primary exit — matches the desktop sidebar "← All Modules". */}
              <Link
                href="/dashboard"
                onClick={closeOnClick}
                className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 mb-4 text-sm font-semibold text-green-800 transition-colors hover:bg-green-100 dark:border-green-900/60 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/30"
              >
                <span className="text-lg leading-none">←</span>
                <span>Back to Dashboard</span>
                <span className="ml-auto text-xs font-normal text-green-700/70 dark:text-green-400/70">
                  All modules
                </span>
              </Link>

              {/* Secondary business tabs */}
              <div className="grid grid-cols-2 gap-2">
                {MORE_ITEMS.map(item => {
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeOnClick}
                      className={`flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                        active
                          ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="text-base leading-none">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </div>

              {/* Theme toggle relocated from the bottom bar. */}
              <div className="mt-4 flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-800 px-4 py-3">
                <span className="text-sm text-gray-700 dark:text-gray-300">Appearance</span>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
