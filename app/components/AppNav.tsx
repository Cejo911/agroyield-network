'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ThemeToggle from './ThemeToggle'
import NotificationBell from './NotificationBell'
import Image from 'next/image'

const NAV_LINKS = [
  { href: '/dashboard',     label: 'Dashboard' },
  { href: '/community',     label: 'Community' },
  { href: '/opportunities', label: 'Opportunities' },
  { href: '/grants',        label: 'Grants' },
  { href: '/marketplace',   label: 'Marketplace' },
  { href: '/prices',        label: 'Price Tracker' },
  { href: '/directory',     label: 'Directory' },
  { href: '/research',      label: 'Research' },
  { href: '/mentorship',    label: 'Mentorship' },
  { href: '/business',      label: 'Business' },
]

export default function AppNav() {
  const [menuOpen,    setMenuOpen]    = useState(false)
  const [userOpen,    setUserOpen]    = useState(false)
  const [isAdmin,     setIsAdmin]     = useState<boolean | null>(null)
  const [userInitial, setUserInitial] = useState('?')
  const [userAvatar,  setUserAvatar]  = useState<string | null>(null)
  const [userEmail,   setUserEmail]   = useState('')
  const [unreadMsgCount, setUnreadMsgCount] = useState(0)
  const [userTier, setUserTier] = useState<string>('free')
  const pathname = usePathname()
  const router   = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    const supabaseAny = supabase as any
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserEmail(user.email || '')
      supabaseAny
        .from('profiles')
        .select('is_admin, first_name, avatar_url, subscription_tier, subscription_expires_at')
        .eq('id', user.id)
        .single()
        .then(({ data }: { data: { is_admin: boolean; first_name: string; avatar_url: string | null; subscription_tier: string | null; subscription_expires_at: string | null } | null }) => {
          if (data) {
            setIsAdmin(data.is_admin)
            setUserInitial((data.first_name || user.email || '?')[0].toUpperCase())
            setUserAvatar(data.avatar_url || null)
            // Determine effective tier (expired subscriptions fall back to free)
            const tier = data.subscription_tier || 'free'
            const expired = data.subscription_expires_at && new Date(data.subscription_expires_at) <= new Date()
            setUserTier(expired ? 'free' : tier)
          }
        })

      // Fetch unread message count
      const fetchUnread = async () => {
        const [{ data: convosA }, { data: convosB }] = await Promise.all([
          supabaseAny.from('conversations').select('id').eq('participant_a', user.id),
          supabaseAny.from('conversations').select('id').eq('participant_b', user.id),
        ])
        const convoIds = [...(convosA ?? []), ...(convosB ?? [])].map((c: { id: string }) => c.id)
        if (convoIds.length === 0) return
        const { count } = await supabaseAny
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .in('conversation_id', convoIds)
          .neq('sender_id', user.id)
          .neq('status', 'read')
        setUnreadMsgCount(count ?? 0)
      }
      fetchUnread()
      const interval = setInterval(fetchUnread, 30000) // refresh every 30s
      return () => clearInterval(interval)
    })
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserOpen(false)
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

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50">
      <div className="w-full px-4 xl:px-8 py-3 flex items-center justify-between gap-3">

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
  {/* Horizontal logo on desktop */}
  <Image
    src="/logo-horizontal-colored.png"
    alt="AgroYield Network"
    width={200}
    height={50}
    className="hidden sm:block dark:hidden"
  />
  <Image
    src="/logo-horizontal-white.png"
    alt="AgroYield Network"
    width={200}
    height={50}
    className="hidden dark:sm:block"
  />
</Link>

        {/* Desktop nav links */}
        <nav className="hidden xl:flex items-center gap-1 flex-1 justify-center overflow-hidden">
          {NAV_LINKS.map(link => (
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
        </nav>

        {/* Desktop right side — ThemeToggle + User avatar dropdown */}
        <div className="hidden xl:flex items-center gap-2 shrink-0">
          {/* Subscription CTA / Tier badge for non-admins */}
          {isAdmin === false && userTier === 'free' && (
            <Link
              href="/pricing"
              className="group relative inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 rounded-full px-4 py-1.5 shadow-sm shadow-green-200 dark:shadow-green-900/40 transition-all hover:shadow-md hover:scale-[1.02]"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Upgrade
            </Link>
          )}
          {isAdmin === false && userTier === 'pro' && (
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-full px-3 py-1 transition-colors hover:bg-green-100 dark:hover:bg-green-900/50"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Pro
            </Link>
          )}
          {isAdmin === false && userTier === 'growth' && (
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-full px-3 py-1 transition-colors hover:bg-amber-100 dark:hover:bg-amber-900/50"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Growth
            </Link>
          )}

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
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
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
              className="w-8 h-8 rounded-full bg-green-600 dark:bg-green-700 text-white text-sm font-bold flex items-center justify-center hover:bg-green-700 dark:hover:bg-green-600 transition-colors overflow-hidden"
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
                {/* User info */}
                <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 mb-1">
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{userEmail}</p>
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
                  <span>👤</span> My Profile
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
                    <span>⚙️</span> Admin Dashboard
                  </Link>
                )}

                <div className="border-t border-gray-100 dark:border-gray-800 mt-1 pt-1">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <span>🚪</span> Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile hamburger */}
        <button
          className="xl:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-lg"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="xl:hidden border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 space-y-1">
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
              <span>👤</span> My Profile
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <span>⚙️</span> Admin Dashboard
              </Link>
            )}

            {isAdmin === false && userTier === 'free' && (
              <Link
                href="/pricing"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-500 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Upgrade Your Plan
              </Link>
            )}
            {isAdmin === false && userTier === 'pro' && (
              <Link
                href="/pricing"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Pro Plan Active
              </Link>
            )}
            {isAdmin === false && userTier === 'growth' && (
              <Link
                href="/pricing"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                Growth Plan Active
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
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
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

            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <span>🚪</span> Sign out
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
