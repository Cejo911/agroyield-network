'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV_LINKS = [
  { href: '/dashboard',     label: 'Dashboard' },
  { href: '/directory',     label: 'Directory' },
  { href: '/opportunities', label: 'Opportunities' },
  { href: '/prices',        label: 'Price Tracker' },
  { href: '/marketplace',   label: 'Marketplace' },
  { href: '/research',      label: 'Research' },
]

type ResultItem = { id: string; title: string; subtitle?: string; href: string }
type SearchResults = {
  people:        ResultItem[]
  opportunities: ResultItem[]
  listings:      ResultItem[]
  research:      ResultItem[]
}
const SECTIONS: { key: keyof SearchResults; label: string; emoji: string }[] = [
  { key: 'people',        label: 'People',        emoji: '👤' },
  { key: 'opportunities', label: 'Opportunities',  emoji: '📋' },
  { key: 'listings',      label: 'Marketplace',    emoji: '🛒' },
  { key: 'research',      label: 'Research',       emoji: '🔬' },
]

function SearchIcon() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24"
      stroke="currentColor" strokeWidth={2} xmlns="http://www.w3.org/2000/svg">
      <circle cx="11" cy="11" r="8" />
      <path strokeLinecap="round" d="m21 21-4.35-4.35" />
    </svg>
  )
}

export default function AppNav() {
  const [menuOpen,   setMenuOpen]   = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query,      setQuery]      = useState('')
  const [results,    setResults]    = useState<SearchResults | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [isAdmin,    setIsAdmin]    = useState(false)

  const pathname    = usePathname()
  const router      = useRouter()
  const inputRef    = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Check admin status on mount
  useEffect(() => {
    const checkAdmin = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()
      const raw = data as Record<string, unknown> | null
      if (raw?.is_admin === true) setIsAdmin(true)
    }
    checkAdmin()
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  const openSearch = () => {
    setSearchOpen(true)
    setQuery('')
    setResults(null)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const closeSearch = () => {
    setSearchOpen(false)
    setQuery('')
    setResults(null)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSearch()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim() || query.length < 2) {
      setResults(null)
      setLoading(false)
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        const data = await res.json() as { results: SearchResults }
        setResults(data.results)
      } catch (_err) {
        setResults(null)
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const hasResults = results !== null &&
    SECTIONS.some(s => results[s.key].length > 0)

  return (
    <>
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <span className="text-2xl">🌾</span>
            <span className="font-bold text-green-700 text-lg hidden sm:block">AgroYield Network</span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map(link => (
              <Link key={link.href} href={link.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? 'bg-green-50 text-green-700'
                    : 'text-gray-600 hover:text-green-700 hover:bg-gray-50'
                }`}>
                {link.label}
              </Link>
            ))}
            {isAdmin && (
              <Link href="/admin"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/admin')
                    ? 'bg-purple-50 text-purple-700'
                    : 'text-purple-600 hover:text-purple-700 hover:bg-purple-50'
                }`}>
                ⚙ Admin
              </Link>
            )}
          </nav>

          {/* Desktop right actions */}
          <div className="hidden lg:flex items-center gap-3">
            <button onClick={openSearch}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
              aria-label="Search platform">
              <SearchIcon />
              <span className="hidden xl:inline text-gray-400">Search…</span>
            </button>
            <Link href="/profile"
              className={`text-sm font-medium transition-colors ${
                isActive('/profile') ? 'text-green-700' : 'text-gray-600 hover:text-green-700'
              }`}>
              My Profile
            </Link>
            <button onClick={handleSignOut}
              className="text-sm text-gray-500 hover:text-red-600 transition-colors">
              Sign out
            </button>
          </div>

          {/* Mobile: search icon + hamburger */}
          <div className="lg:hidden flex items-center gap-1">
            <button onClick={openSearch}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
              aria-label="Search">
              <SearchIcon />
            </button>
            <button
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 text-lg"
              onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="lg:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
            {NAV_LINKS.map(link => (
              <Link key={link.href} href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? 'bg-green-50 text-green-700'
                    : 'text-gray-600 hover:text-green-700 hover:bg-gray-50'
                }`}>
                {link.label}
              </Link>
            ))}
            {isAdmin && (
              <Link href="/admin"
                onClick={() => setMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/admin')
                    ? 'bg-purple-50 text-purple-700'
                    : 'text-purple-600 hover:text-purple-700 hover:bg-purple-50'
                }`}>
                ⚙ Admin
              </Link>
            )}
            <Link href="/profile"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-green-700 hover:bg-gray-50">
              My Profile
            </Link>
            <button onClick={handleSignOut}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors">
              Sign out
            </button>
          </div>
        )}
      </header>

      {/* ── Search modal ── */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4 bg-black/50 backdrop-blur-sm"
          onClick={closeSearch}>
          <div
            className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}>
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
              <span className="text-gray-400 shrink-0"><SearchIcon /></span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search members, opportunities, listings, research…"
                className="flex-1 text-sm bg-transparent outline-none text-gray-800 placeholder-gray-400"
              />
              {loading && (
                <span className="text-xs text-gray-400 animate-pulse shrink-0">Searching…</span>
              )}
              <kbd onClick={closeSearch}
                className="hidden sm:inline text-xs text-gray-400 border border-gray-200 rounded px-2 py-0.5 cursor-pointer hover:bg-gray-50">
                esc
              </kbd>
            </div>
            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto">
              {!query && (
                <p className="text-center text-sm text-gray-400 py-10">
                  Start typing to search across the platform
                </p>
              )}
              {query.length === 1 && (
                <p className="text-center text-sm text-gray-400 py-10">
                  Type at least 2 characters…
                </p>
              )}
              {query.length >= 2 && !loading && !hasResults && (
                <p className="text-center text-sm text-gray-400 py-10">
                  No results found for &ldquo;{query}&rdquo;
                </p>
              )}
              {hasResults && results && (
                <div className="py-2">
                  {SECTIONS.map(({ key, label, emoji }) => {
                    const items = results[key]
                    if (!items.length) return null
                    return (
                      <div key={key}>
                        <div className="px-4 pt-3 pb-1">
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            {emoji} {label}
                          </span>
                        </div>
                        {items.map(item => (
                          <Link key={item.id} href={item.href} onClick={closeSearch}
                            className="flex flex-col px-4 py-2.5 hover:bg-green-50 transition-colors">
                            <span className="text-sm font-medium text-gray-800">{item.title}</span>
                            {item.subtitle && (
                              <span className="text-xs text-gray-500 truncate">{item.subtitle}</span>
                            )}
                          </Link>
                        ))}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
