'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ThemeToggle from './ThemeToggle'

const NAV_LINKS = [
  { href: '/dashboard',    label: 'Dashboard' },
  { href: '/directory',    label: 'Directory' },
  { href: '/opportunities',label: 'Opportunities' },
  { href: '/prices',       label: 'Price Tracker' },
  { href: '/marketplace',  label: 'Marketplace' },
  { href: '/research',     label: 'Research' },
]

export default function AppNav() {
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname  = usePathname()
  const router    = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">

        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
          <span className="text-2xl">🌾</span>
          <span className="font-bold text-green-700 dark:text-green-400 text-lg hidden sm:block">
            AgroYield Network
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? 'bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                  : 'text-gray-600 dark:text-gray-300 hover:text-green-700 dark:hover:text-green-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop right side */}
        <div className="hidden lg:flex items-center gap-3">
          <Link
            href="/pricing"
            className="text-sm font-semibold text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
          >
            Get Verified ✓
          </Link>
          <ThemeToggle />
          <Link
            href="/profile"
            className={`text-sm font-medium transition-colors ${
              isActive('/profile')
                ? 'text-green-700 dark:text-green-400'
                : 'text-gray-600 dark:text-gray-300 hover:text-green-700 dark:hover:text-green-400'
            }`}
          >
            My Profile
          </Link>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            Sign out
          </button>
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

          <Link
            href="/pricing"
            onClick={() => setMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-semibold text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/40"
          >
            Get Verified ✓
          </Link>

          <Link
            href="/profile"
            onClick={() => setMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-green-700 dark:hover:text-green-400 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            My Profile
          </Link>

          {/* Theme toggle row in mobile menu */}
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Dark mode</span>
            <ThemeToggle />
          </div>

          <button
            onClick={handleSignOut}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </header>
  )
}
