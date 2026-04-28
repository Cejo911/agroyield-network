'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getEffectiveTier } from '@/lib/tiers'
import ThemeToggle from './ThemeToggle'
import NotificationBell from './NotificationBell'
import GlobalSearchBar from './GlobalSearchBar'
import Modal from './design/Modal'
import Image from 'next/image'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

// AppNav top-level links — split between two surfaces:
//
//   • PRIMARY_NAV_LINKS — the seven highest-traffic destinations rendered
//     inline on desktop. Calibrated to AgroYield's own usage (Dashboard
//     is the home shell; Community / Opportunities / Marketplace / Price
//     Tracker are the four highest-traffic content modules; Directory is
//     the people-finder; Business is the SME suite). Lower-frequency
//     surfaces (Grants, Research, Mentorship) are collapsed under the
//     "More" dropdown so the inline rail doesn't wrap on a 13" laptop.
//
//   • OVERFLOW_NAV_LINKS — the three links inside the "More" dropdown.
//
//   • NAV_LINKS — the union, used for the mobile menu (which renders all
//     ten as a vertical list — phones don't have the wrap problem the
//     overflow split exists to solve).
//
// Touching either constant requires a corresponding update to the active-
// route handling for "More" — `isOverflowActive` recomputes from the
// current pathname against the OVERFLOW_NAV_LINKS hrefs, so adding /
// removing items there is sufficient.
const PRIMARY_NAV_LINKS = [
  { href: '/dashboard',     label: 'Dashboard' },
  { href: '/community',     label: 'Community' },
  { href: '/opportunities', label: 'Opportunities' },
  { href: '/marketplace',   label: 'Marketplace' },
  { href: '/prices',        label: 'Price Tracker' },
  { href: '/directory',     label: 'Directory' },
  { href: '/business',      label: 'Business' },
]

const OVERFLOW_NAV_LINKS = [
  { href: '/grants',     label: 'Grants' },
  { href: '/research',   label: 'Research' },
  { href: '/mentorship', label: 'Mentorship' },
]

const NAV_LINKS = [...PRIMARY_NAV_LINKS, ...OVERFLOW_NAV_LINKS]

export default function AppNav() {
  const [menuOpen,    setMenuOpen]    = useState(false)
  const [userOpen,    setUserOpen]    = useState(false)
  const [moreOpen,    setMoreOpen]    = useState(false)
  const [isAdmin,     setIsAdmin]     = useState<boolean | null>(null)
  const [userInitial, setUserInitial] = useState('?')
  const [userAvatar,  setUserAvatar]  = useState<string | null>(null)
  const [userEmail,   setUserEmail]   = useState('')
  const [unreadMsgCount, setUnreadMsgCount] = useState(0)
  const [userTier, setUserTier] = useState<string>('free')
  const pathname = usePathname()
  const router   = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const moreRef     = useRef<HTMLDivElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const supabase = createClient() as SupabaseClient<Database>
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserEmail(user.email || '')
      supabase
        .from('profiles')
        .select('is_admin, first_name, avatar_url, subscription_tier, subscription_expires_at')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setIsAdmin(data.is_admin)
            setUserInitial((data.first_name || user.email || '?')[0].toUpperCase())
            setUserAvatar(data.avatar_url || null)
            // Determine effective tier (expired subscriptions fall back to free)
            setUserTier(getEffectiveTier(data))
          }
        })

      // Presence heartbeat — update last_seen_at every 60s
      let lastHeartbeat = 0
      const heartbeat = () => {
        if (Date.now() - lastHeartbeat < 120000) return // skip if < 2 min since last
        lastHeartbeat = Date.now()
        supabase
          .from('profiles')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', user.id)
          .then(() => {})
      }
      heartbeat() // fire immediately
      const heartbeatInterval = setInterval(heartbeat, 60000)

      // Fetch unread message count
      const fetchUnread = async () => {
        const [{ data: convosA }, { data: convosB }] = await Promise.all([
          supabase.from('conversations').select('id').eq('participant_a', user.id),
          supabase.from('conversations').select('id').eq('participant_b', user.id),
        ])
        const convoIds = [...(convosA ?? []), ...(convosB ?? [])].map((c) => c.id)
        if (convoIds.length === 0) return
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .in('conversation_id', convoIds)
          .neq('sender_id', user.id)
          .neq('status', 'read')
        setUnreadMsgCount(count ?? 0)
      }
      fetchUnread()
      const interval = setInterval(fetchUnread, 30000) // refresh every 30s

      // Cleanup both intervals
      const cleanup = () => {
        clearInterval(interval)
        clearInterval(heartbeatInterval)
      }
      // Store cleanup for useEffect return
      cleanupRef.current = cleanup
    })
    return () => cleanupRef.current?.()
  }, [])

  // Close dropdowns when clicking outside. Two independent triggers
  // (the user-avatar disc and the "More" overflow trigger) share one
  // mousedown listener — each runs its own contains-check so a click
  // inside one doesn't close the other.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setUserOpen(false)
      }
      if (moreRef.current && !moreRef.current.contains(target)) {
        setMoreOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  // Active-route detection for the "More" trigger — flips on whenever
  // the current pathname matches any of the overflow links so the
  // collapsed parent reflects deep-link state (otherwise a user reading
  // /research/abc123 would see no nav highlight at all).
  const isOverflowActive = OVERFLOW_NAV_LINKS.some(link => isActive(link.href))

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50">
      <div className="w-full px-4 lg:px-8 py-3 flex items-center justify-between gap-3">

        {/* Logo */}
<Link href="/dashboard" className="flex items-center shrink-0">
  {/* Icon only on mobile */}
  <Image
    src="/logo-icon-colored.png"
    alt="AgroYield Network"
    width={44}
    height={44}
    className="block sm:hidden"
  />
  {/* Horizontal logo on desktop — matches signup page benchmark (200×58). */}
  <Image
    src="/logo-horizontal-colored.png"
    alt="AgroYield Network"
    width={200}
    height={58}
    className="hidden h-[58px] w-auto sm:block dark:hidden"
  />
  <Image
    src="/logo-horizontal-white.png"
    alt="AgroYield Network"
    width={200}
    height={58}
    className="hidden h-[58px] w-auto dark:sm:block"
  />
</Link>

        {/* Desktop nav links — seven inline + a "More" dropdown for the
            three lower-frequency surfaces. Breakpoint is `lg` (1024px),
            not the previous `xl` (1280px), because B2B users on
            13"-class laptops expect the desktop rail at 1024+. The
            "More" trigger is rendered as the eighth slot and uses the
            same shape/colours as the inline links so a glance can't
            tell the rail is split. */}
        {/* `overflow-visible` (the default) is required so the absolute-
            positioned "More" dropdown can render BELOW the nav without
            being clipped by the nav's bottom edge. The earlier
            `overflow-hidden` was inherited from when the nav held
            10 inline links and could awkward-wrap; with 7+More that's
            no longer a risk, and clipping the dropdown made it look
            like nothing happened on click. */}
        <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center">
          {PRIMARY_NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                isActive(link.href)
                  ? 'bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                  : 'text-gray-600 dark:text-gray-300 hover:text-green-700 dark:hover:text-green-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {link.label}
            </Link>
          ))}

          {/* "More" overflow dropdown — collapses Grants / Research /
              Mentorship under one trigger. Click-outside is wired in
              the shared mousedown effect; aria-expanded /
              aria-haspopup announce dropdown semantics; the menu uses
              role="menu" with role="menuitem" children so screen
              readers don't treat it as a generic group. */}
          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setMoreOpen(!moreOpen)}
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                isOverflowActive
                  ? 'bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                  : 'text-gray-600 dark:text-gray-300 hover:text-green-700 dark:hover:text-green-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              More
              <svg
                aria-hidden="true"
                className={`w-3.5 h-3.5 transition-transform ${moreOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {moreOpen && (
              <div
                role="menu"
                aria-label="More navigation"
                className="absolute left-1/2 -translate-x-1/2 mt-2 w-44 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-lg py-1.5 z-50"
              >
                {OVERFLOW_NAV_LINKS.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    role="menuitem"
                    onClick={() => setMoreOpen(false)}
                    className={`block px-4 py-2 text-sm transition-colors ${
                      isActive(link.href)
                        ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Desktop right side — ThemeToggle + User avatar dropdown */}
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <GlobalSearchBar variant="icon" />

          <ThemeToggle />

          {/* Messages icon */}
          <Link
            href="/messages"
            className={`relative p-2 rounded-lg transition-colors ${
              isActive('/messages')
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30'
                : 'text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
            title="Messages"
            aria-label="Messages"
          >
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 00-1.032-.211 50.89 50.89 0 00-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 002.433 3.984L7.28 21.53A.75.75 0 016 21v-4.03a48.527 48.527 0 01-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979z" />
              <path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.814 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 001.28-.53v-2.39l.33-.026c1.542-.125 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.125-2.811-2.664-2.94A49.392 49.392 0 0015.75 7.5z" />
            </svg>
            {unreadMsgCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-green-600 text-white text-[10px] font-bold rounded-full px-1">
                {unreadMsgCount > 9 ? '9+' : unreadMsgCount}
              </span>
            )}
          </Link>

          <NotificationBell />
          {/* User avatar dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setUserOpen(!userOpen)}
              className={`w-8 h-8 rounded-full bg-green-600 dark:bg-green-700 text-white text-sm font-bold flex items-center justify-center hover:bg-green-700 dark:hover:bg-green-600 transition-colors overflow-hidden ${
                userTier === 'pro'
                  ? 'ring-2 ring-green-400 ring-offset-2 ring-offset-white dark:ring-offset-gray-900'
                  : userTier === 'growth'
                    ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-white dark:ring-offset-gray-900'
                    : ''
              }`}
              title="Account"
            >
              {userAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={userAvatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                userInitial
              )}
            </button>

            {userOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-lg py-1.5 z-50">
                {/* User info + tier */}
                <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 mb-1">
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{userEmail}</p>
                  {isAdmin === false && (
                    <Link
                      href="/pricing"
                      onClick={() => setUserOpen(false)}
                      className={`inline-flex items-center gap-1.5 mt-1.5 text-xs font-semibold rounded-full px-2.5 py-0.5 transition-colors ${
                        userTier === 'growth'
                          ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30'
                          : userTier === 'pro'
                            ? 'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30'
                            : 'text-white bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400'
                      }`}
                    >
                      {userTier === 'growth' && (
                        <>
                          <svg aria-hidden="true" className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          Growth Plan
                        </>
                      )}
                      {userTier === 'pro' && (
                        <>
                          <svg aria-hidden="true" className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Pro Plan
                        </>
                      )}
                      {userTier === 'free' && (
                        <>
                          <svg aria-hidden="true" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                          Upgrade
                        </>
                      )}
                    </Link>
                  )}
                </div>

                <Link
                  href="/profile"
                  onClick={() => setUserOpen(false)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                    isActive('/profile')
                      ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <svg aria-hidden="true" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  My Profile
                </Link>

                <Link
                  href="/saved"
                  onClick={() => setUserOpen(false)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                    isActive('/saved')
                      ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <svg aria-hidden="true" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  Saved
                </Link>

                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setUserOpen(false)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                      isActive('/admin')
                        ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <svg aria-hidden="true" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317a1 1 0 011.35 0l1.06 1.06a1 1 0 00.708.293h1.5a1 1 0 011 1v1.5a1 1 0 00.293.707l1.06 1.06a1 1 0 010 1.414l-1.06 1.06a1 1 0 00-.293.707v1.5a1 1 0 01-1 1h-1.5a1 1 0 00-.708.293l-1.06 1.06a1 1 0 01-1.414 0l-1.06-1.06a1 1 0 00-.707-.293h-1.5a1 1 0 01-1-1v-1.5a1 1 0 00-.293-.707l-1.06-1.06a1 1 0 010-1.414l1.06-1.06a1 1 0 00.293-.707V6.67a1 1 0 011-1h1.5a1 1 0 00.707-.293l1.06-1.06zM12 14a3 3 0 100-6 3 3 0 000 6z" />
                    </svg>
                    Admin Dashboard
                  </Link>
                )}

                <div className="border-t border-gray-100 dark:border-gray-800 mt-1 pt-1">
                  <Link
                    href="/support"
                    onClick={() => setUserOpen(false)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                      isActive('/support')
                        ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <svg aria-hidden="true" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636L5.636 18.364M5.636 5.636l12.728 12.728M3 12a9 9 0 1118 0 9 9 0 01-18 0z" opacity="0" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h14a2 2 0 012 2v3.5a1.5 1.5 0 100 3V17a2 2 0 01-2 2H5a2 2 0 01-2-2v-3.5a1.5 1.5 0 100-3V7z" />
                    </svg>
                    Support
                  </Link>
                  <Link
                    href="/faq"
                    onClick={() => setUserOpen(false)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                      isActive('/faq')
                        ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <svg aria-hidden="true" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093M12 17h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    FAQ
                  </Link>
                </div>

                <div className="border-t border-gray-100 dark:border-gray-800 mt-1 pt-1">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <svg aria-hidden="true" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile hamburger.
            44x44 touch target (Apple HIG min, larger than Material's 48
            requires extra padding the surrounding row can't absorb).
            Icons are SVGs (not unicode glyphs) so they don't reflow
            mid-tap when the open/close states swap. ARIA attributes
            announce "Open/Close navigation menu" + the expanded state to
            screen readers; aria-controls points at the panel below. */}
        <button
          className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          type="button"
        >
          {menuOpen ? (
            <svg aria-hidden="true" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg aria-hidden="true" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu — uses the <Modal> primitive for focus trap, Escape
          to close, body-scroll lock, focus restore and aria-modal /
          aria-labelledby wiring. Only the trigger is `lg:hidden` so the
          modal can never open on desktop (the breakpoint dropped from
          `xl` to `lg` so 1024-1280px laptops get the desktop rail).
          We still gate the body rendering on `menuOpen` because Modal
          short-circuits on `open={false}`. The size="lg" + the inner
          div's max-w-full + custom layout reproduce the existing
          "panel" feel without breaking the mobile design. The mobile
          list intentionally renders the full ten-link `NAV_LINKS` —
          phones don't have the wrap problem the desktop overflow split
          exists to solve. */}
      <Modal
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Navigation"
        size="lg"
      >
        <div id="mobile-nav" className="space-y-1">
          <div className="pb-2 mb-2 border-b border-gray-100 dark:border-gray-800">
            <GlobalSearchBar variant="full" />
          </div>

          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? 'bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                  : 'text-gray-600 dark:text-gray-300 hover:text-green-700 dark:hover:text-green-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {link.label}
            </Link>
          ))}

          <div className="border-t border-gray-100 dark:border-gray-800 pt-2 mt-2 space-y-1">
            <Link
              href="/profile"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-green-700 dark:hover:text-green-400 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <svg aria-hidden="true" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              My Profile
            </Link>

            <Link
              href="/saved"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-green-700 dark:hover:text-green-400 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <svg aria-hidden="true" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Saved
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <svg aria-hidden="true" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317a1 1 0 011.35 0l1.06 1.06a1 1 0 00.708.293h1.5a1 1 0 011 1v1.5a1 1 0 00.293.707l1.06 1.06a1 1 0 010 1.414l-1.06 1.06a1 1 0 00-.293.707v1.5a1 1 0 01-1 1h-1.5a1 1 0 00-.708.293l-1.06 1.06a1 1 0 01-1.414 0l-1.06-1.06a1 1 0 00-.707-.293h-1.5a1 1 0 01-1-1v-1.5a1 1 0 00-.293-.707l-1.06-1.06a1 1 0 010-1.414l1.06-1.06a1 1 0 00.293-.707V6.67a1 1 0 011-1h1.5a1 1 0 00.707-.293l1.06-1.06zM12 14a3 3 0 100-6 3 3 0 000 6z" />
                </svg>
                Admin Dashboard
              </Link>
            )}

            {isAdmin === false && (
              <Link
                href="/pricing"
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold ${
                  userTier === 'growth'
                    ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30'
                    : userTier === 'pro'
                      ? 'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30'
                      : 'text-white bg-gradient-to-r from-green-600 to-emerald-500 shadow-sm'
                }`}
              >
                {userTier === 'growth' && (
                  <>
                    <svg aria-hidden="true" className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    Growth Plan
                  </>
                )}
                {userTier === 'pro' && (
                  <>
                    <svg aria-hidden="true" className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Pro Plan
                  </>
                )}
                {userTier === 'free' && (
                  <>
                    <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    Upgrade Your Plan
                  </>
                )}
              </Link>
            )}
            <Link
              href="/messages"
              onClick={() => setMenuOpen(false)}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/messages')
                  ? 'bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                  : 'text-gray-600 dark:text-gray-300 hover:text-green-700 dark:hover:text-green-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 00-1.032-.211 50.89 50.89 0 00-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 002.433 3.984L7.28 21.53A.75.75 0 016 21v-4.03a48.527 48.527 0 01-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979z" />
                  <path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.814 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 001.28-.53v-2.39l.33-.026c1.542-.125 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.125-2.811-2.664-2.94A49.392 49.392 0 0015.75 7.5z" />
                </svg>
                Messages
              </span>
              {unreadMsgCount > 0 && (
                <span className="min-w-[20px] h-5 flex items-center justify-center bg-green-600 text-white text-[10px] font-bold rounded-full px-1.5">
                  {unreadMsgCount > 9 ? '9+' : unreadMsgCount}
                </span>
              )}
            </Link>

            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Notifications</span>
              <NotificationBell />
            </div>
            
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Dark mode</span>
              <ThemeToggle />
            </div>

            <Link
              href="/support"
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/support')
                  ? 'bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                  : 'text-gray-600 dark:text-gray-300 hover:text-green-700 dark:hover:text-green-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <svg aria-hidden="true" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h14a2 2 0 012 2v3.5a1.5 1.5 0 100 3V17a2 2 0 01-2 2H5a2 2 0 01-2-2v-3.5a1.5 1.5 0 100-3V7z" />
              </svg>
              Support
            </Link>
            <Link
              href="/faq"
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/faq')
                  ? 'bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                  : 'text-gray-600 dark:text-gray-300 hover:text-green-700 dark:hover:text-green-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <svg aria-hidden="true" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093M12 17h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              FAQ
            </Link>

            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <svg aria-hidden="true" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      </Modal>
    </header>
  )
}
