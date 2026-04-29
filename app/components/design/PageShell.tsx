import type { ReactNode } from 'react'
import AppNav from '../AppNav'

// Design primitive — the single source of truth for the outer chrome that
// wraps every authenticated module index page (dashboard, opportunities,
// grants, marketplace, community, directory, mentorship, research, prices).
// Before extraction, this shell was copy-pasted 9× with subtle width drift.
//
// Usage:
//   <PageShell maxWidth="6xl">
//     <PageHeader title="…" description="…" actions={…} />
//     …
//   </PageShell>
//
// Escape hatches: `nav` replaces the default AppNav (useful for modules with
// their own chrome like /business), and `beforeMain` slots content between
// the nav and <main> (onboarding wizards, banners pinned above the header).

// 'none' = no max-width wrapper; the child controls its own width. Useful for
// pages like /faq where the inner client component renders its own container.
type MaxWidth = '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'none'

const MAX_WIDTH_CLASS: Record<MaxWidth, string> = {
  '2xl':  'max-w-2xl',
  '3xl':  'max-w-3xl',
  '4xl':  'max-w-4xl',
  '5xl':  'max-w-5xl',
  '6xl':  'max-w-6xl',
  '7xl':  'max-w-7xl',
  'none': '',
}

export default function PageShell({
  children,
  maxWidth = '6xl',
  nav,
  beforeMain,
}: {
  children: ReactNode
  maxWidth?: MaxWidth
  nav?: ReactNode
  beforeMain?: ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {nav ?? <AppNav />}
      {beforeMain}
      {/* `id="main"` is the anchor target for the sitewide skip-to-content
          link in app/layout.tsx. Every PageShell-wrapped page (~9 module
          indexes) gets keyboard skip-to-content for free; pages that mount
          their own <main> outside PageShell add the id themselves. */}
      <main id="main" className={`${MAX_WIDTH_CLASS[maxWidth]} mx-auto px-4 py-10`}>
        {children}
      </main>
    </div>
  )
}
