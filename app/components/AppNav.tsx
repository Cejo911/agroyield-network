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
  { href: '/directory',     label: 'Directory' },
  { href: '/opportunities', label: 'Opportunities' },
  { href: '/grants',        label: 'Grants' },
  { href: '/prices',        label: 'Price Tracker' },
  { href: '/marketplace',   label: 'Marketplace' },
  { href: '/research',      label: 'Research' },
  { href: '/mentorship',    label: 'Mentorship' },
  { href: '/business',      label: 'Business' },
  { href: '/community',    label: 'Community' },
]

export default function AppNav() {
  const [menuOpen,    setMenuOpen]    = useState(false)
  const [userOpen,    setUserOpen]    = useState(false)
  const [isAdmin,     setIsAdmin]     = useState<boolean | null>(null)
  const [userInitial, setUserInitial] = useState('?')
  const [userEmail,   setUserEmail]   = useState('')
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
        .select('is_admin, first_name')
        .eq('id', user.id)
        .single()
        .then(({ data }: { data: { is_admin: boolean; first_name: string } | null }) => {
          if (data) {
            setIsAdmin(data.is_admin)
            setUserInitial((data.first_name || user.email || '?')[0].toUpperCase())
          }
        })
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
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">

        {/* Logo */}
        {/* Logo */}
<Link href="/dashboard" className="flex items-center shrink-0">
  {/* Icon only on mobile */}
  <Image
    src="/logo-icon-colored.png"
    alt="AgroYield Network"
    width={40}
    height={40}
    className="block sm:hidden"
  />
  {/* Horizontal logo on desktop */}
  <Image
    src="/logo-horizontal-colored.png"
    alt="AgroYield Network"
    width={190}
    height={48}
    className="hidden sm:block dark:hidden"
  />
  <Image
    src="/logo-horizontal-white.png"
    alt="AgroYield Network"
    width={190}
    height={48}
    className="hidden dark:sm:block"
  />
</Link>

        {/* Desktop nav links */}
        <nav className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
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
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          {/* Get Verified badge for non-admins */}
          {isAdmin === false && (
            <Link
              href="/pricing"
              className="text-xs font-semibold text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 border border-green-200 dark:border-green-800 rounded-full px-3 py-1 transition-colors"
            >
              Get Verified ✓
            </Link>
          )}

          <ThemeToggle />
          <NotificationBell />
          {/* User avatar dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setUserOpen(!userOpen)}
              className="w-8 h-8 rounded-full bg-green-600 dark:bg-green-700 text-white text-sm font-bold flex items-center justify-center hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
              title="Account"
            >
              {userInitial}
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
          className="lg:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-lg"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 space-y-1">
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

            {isAdmin === false && (
              <Link
                href="/pricing"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/40"
              >
                Get Verified ✓
              </Link>
            )}
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
