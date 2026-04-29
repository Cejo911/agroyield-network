'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import UserAvatar from '@/app/components/design/UserAvatar'

// Mobile bottom-tab navigation — primary on-glass nav for `<md` viewports.
//
// AgroYield's audience is mobile-first; the audit's #1 mobile finding was
// "every primary destination requires opening the hamburger first (2 taps
// minimum). LinkedIn / Twitter / Instagram all have a fixed bottom bar
// with 4-5 icons in the thumb zone." This component closes that gap.
//
// Five tabs: Home (Dashboard), Community, Marketplace, Messages, Profile.
// Chosen for thumb-zone reach + activation frequency from the dashboard
// module-card pattern. Less-frequent destinations (Opportunities, Grants,
// Research, Mentorship, Directory, Business) stay reachable via the
// existing AppNav hamburger / "More" dropdown — the bottom bar
// deliberately does NOT mirror the full nav surface, because cramming 8+
// icons into a 360-wide phone breaks the affordance.
//
// Rendering rules:
//   • md:hidden — visible only on `<md` (768 px). Desktops keep the top
//     AppNav exclusively. Avoids the "two navs at once" footgun on a
//     resize-into-mobile-shaped window.
//   • Renders nothing when not signed in. Anonymous visitors only see
//     marketing pages where AppNav itself is absent or thin; the bottom
//     bar would be noise for them.
//   • Fixed positioning so the bar stays in the thumb zone during scroll.
//     z-40 places it below modals (which use z-50) so the Modal primitive
//     overlay correctly covers everything including this bar.
//   • Renders a sibling spacer of equivalent height (in document flow,
//     `md:hidden`) so any scrollable container's last items aren't
//     forever hidden behind the floating bar. Pages with their own
//     fixed/sticky bottom UI (e.g. message-thread composer) need to
//     account for this height separately — see the in-line comment in
//     the spacer JSX.
//
// Active-state detection mirrors the AppNav rule: prefix-match on
// pathname, with `/dashboard` matching exactly because `/` would
// otherwise match every page.

type Props = {
  isAuthed: boolean
  userInitial: string
  userAvatar: string | null
  unreadMsgCount: number
}

const TABS: Array<{
  href: string
  label: string
  match: (pathname: string) => boolean
  icon: React.ReactNode
}> = [
  {
    href: '/dashboard',
    label: 'Home',
    match: p => p === '/dashboard' || p.startsWith('/dashboard/'),
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.5 1.5 0 012.122 0L22.28 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    href: '/community',
    label: 'Community',
    match: p => p === '/community' || p.startsWith('/community/'),
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-1.927-1.184c-1.087-.06-2.181-.09-3.282-.09-1.1 0-2.195.03-3.282.09-1.087.06-1.927.95-1.927 2.043v4.286c0 1.094.84 1.984 1.927 2.043m9.345-8.334v.834c0 .455-.052.898-.151 1.323M3.75 8.25v6.328c0 .68.55 1.232 1.231 1.232h2.519v3.091l3-3c1.354 0 2.694-.055 4.02-.163a2.115 2.115 0 01.825-.242M3.75 8.25c0-1.094.84-1.984 1.927-2.043 1.087-.06 2.181-.09 3.282-.09 1.1 0 2.195.03 3.282.09 1.087.06 1.927.95 1.927 2.043v.834c0 .455-.052.898-.151 1.323" />
      </svg>
    ),
  },
  {
    href: '/marketplace',
    label: 'Market',
    // /marketplace/orders also lights this up — the orders flow is
    // marketplace-adjacent, not a separate destination.
    match: p => p === '/marketplace' || p.startsWith('/marketplace/'),
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
      </svg>
    ),
  },
  {
    href: '/messages',
    label: 'Inbox',
    match: p => p === '/messages' || p.startsWith('/messages/'),
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 00-1.032-.211 50.89 50.89 0 00-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 002.433 3.984L7.28 21.53A.75.75 0 016 21v-4.03a48.527 48.527 0 01-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979z" />
        <path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.814 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 001.28-.53v-2.39l.33-.026c1.542-.125 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.125-2.811-2.664-2.94A49.392 49.392 0 0015.75 7.5z" />
      </svg>
    ),
  },
  {
    href: '/profile',
    label: 'Profile',
    match: p => p === '/profile' || p.startsWith('/profile/'),
    icon: null, // Rendered as UserAvatar via custom branch below
  },
]

export default function BottomTabNav({
  isAuthed,
  userInitial,
  userAvatar,
  unreadMsgCount,
}: Props) {
  const pathname = usePathname() ?? ''

  if (!isAuthed) return null

  // Bottom-of-page offset is handled in app/globals.css — body gets a
  // padding-bottom of 4rem on `<md` so every page's natural document
  // flow ends 64 px above the floating bar. Putting the offset on body
  // (rather than a sibling spacer rendered from this component) was
  // necessary because <BottomTabNav> renders inside <AppNav>, which
  // sits at the TOP of every page; a sibling spacer here would offset
  // the AppNav header, not the page's bottom content (e.g. the DM
  // composer in /messages/[id], which is at the bottom of a flex
  // column further down the document).

  return (
    <>
      <nav
        aria-label="Primary mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
      >
        <ul className="flex items-stretch justify-around h-16">
          {TABS.map(tab => {
            const active = tab.match(pathname)
            const isMessages = tab.href === '/messages'
            const isProfile = tab.href === '/profile'

            return (
              <li key={tab.href} className="flex-1 min-w-0">
                <Link
                  href={tab.href}
                  aria-label={tab.label}
                  aria-current={active ? 'page' : undefined}
                  // 44 × 44 minimum tap target satisfied by h-16 (64) ×
                  // flex-1 width; no inner padding needed beyond the
                  // icon-label stack.
                  className={`relative flex flex-col items-center justify-center gap-0.5 h-full transition-colors ${
                    active
                      ? 'text-green-700 dark:text-green-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {isProfile ? (
                    // Profile tab uses the user's avatar so the bar
                    // gives an identity-anchor at a glance — same
                    // pattern as the Twitter/X / LinkedIn mobile rails.
                    <UserAvatar
                      src={userAvatar}
                      name={userInitial}
                      size="sm"
                      alt="Profile"
                    />
                  ) : (
                    tab.icon
                  )}

                  {/* Unread badge for Messages */}
                  {isMessages && unreadMsgCount > 0 && (
                    <span
                      aria-label={`${unreadMsgCount} unread`}
                      className="absolute top-2 right-1/2 translate-x-3 min-w-[18px] h-[18px] flex items-center justify-center bg-green-600 text-white text-[10px] font-bold rounded-full px-1"
                    >
                      {unreadMsgCount > 9 ? '9+' : unreadMsgCount}
                    </span>
                  )}

                  <span className="text-[10px] font-medium leading-none">
                    {tab.label}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
