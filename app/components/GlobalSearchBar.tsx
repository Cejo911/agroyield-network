'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type {
  GlobalSearchResults,
  GlobalSearchCounts,
  SearchProfile,
  SearchOpportunity,
  SearchGrant,
  SearchMarketplaceListing,
  SearchBusiness,
} from '@/lib/global-search'

// ---------------------------------------------------------------------------
// GlobalSearchBar — command-palette-style overlay.
//
// Trigger: a compact search icon in the desktop nav, or a labelled row in
// the mobile menu. Both expand a full overlay with:
//   • an autofocused input
//   • live results grouped by surface (debounced 250ms)
//   • "See all results" footer linking to /search?q=…
//
// Keyboard: Cmd/Ctrl+K opens, Esc closes. Enter submits → /search?q=…
//
// Result shape: hits /api/search?q=…&limit=5 and relies on the server to
// handle escaping + auth. The client intentionally doesn't know about the
// Supabase schema.
// ---------------------------------------------------------------------------

const DEBOUNCE_MS = 250
const PREVIEW_LIMIT = 5

type ApiResponse = {
  query:   string
  results: GlobalSearchResults
  counts:  GlobalSearchCounts
}

const EMPTY_RESULTS: GlobalSearchResults = {
  profiles: [], opportunities: [], grants: [], marketplace_listings: [], businesses: [],
}

export default function GlobalSearchBar({ variant = 'icon' }: { variant?: 'icon' | 'full' }) {
  const [open,    setOpen]    = useState(false)
  const [q,       setQ]       = useState('')
  const [results, setResults] = useState<GlobalSearchResults>(EMPTY_RESULTS)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const latestQueryRef = useRef('')

  // ---- Debounced fetch --------------------------------------------------
  const runSearch = useCallback(async (query: string) => {
    latestQueryRef.current = query
    if (query.trim().length < 2) {
      setResults(EMPTY_RESULTS)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=${PREVIEW_LIMIT}`)
      const data: ApiResponse = await res.json()
      // Ignore stale responses (later keystroke won the race)
      if (latestQueryRef.current !== query) return
      setResults(data.results || EMPTY_RESULTS)
    } catch {
      if (latestQueryRef.current === query) setResults(EMPTY_RESULTS)
    } finally {
      if (latestQueryRef.current === query) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const handle = setTimeout(() => runSearch(q), DEBOUNCE_MS)
    return () => clearTimeout(handle)
  }, [q, runSearch])

  // ---- Open / close management -----------------------------------------
  const openOverlay = useCallback(() => {
    setOpen(true)
    // Autofocus after mount (next tick)
    setTimeout(() => inputRef.current?.focus(), 10)
  }, [])

  const closeOverlay = useCallback(() => {
    setOpen(false)
    setQ('')
    setResults(EMPTY_RESULTS)
  }, [])

  // Cmd/Ctrl+K hotkey + Escape close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
        if (!open) setTimeout(() => inputRef.current?.focus(), 10)
      } else if (e.key === 'Escape' && open) {
        closeOverlay()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closeOverlay])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = q.trim()
    if (trimmed.length < 2) return
    closeOverlay()
    router.push(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  const total =
    results.profiles.length +
    results.opportunities.length +
    results.grants.length +
    results.marketplace_listings.length +
    results.businesses.length

  return (
    <>
      {/* Trigger */}
      {variant === 'icon' ? (
        <button
          type="button"
          onClick={openOverlay}
          title="Search (⌘K)"
          aria-label="Search"
          className="w-8 h-8 flex items-center justify-center rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </button>
      ) : (
        <button
          type="button"
          onClick={openOverlay}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-green-700 dark:hover:text-green-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          Search
        </button>
      )}

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-start justify-center px-4 pt-16 sm:pt-24"
          onClick={closeOverlay}
        >
          <div
            className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Input row */}
            <form onSubmit={submit} className="relative border-b border-gray-100 dark:border-gray-800">
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-500 pointer-events-none">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                ref={inputRef}
                type="search"
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search people, opportunities, grants, listings, businesses…"
                maxLength={100}
                autoFocus
                className="w-full text-sm bg-transparent pl-11 pr-20 py-4 focus:outline-none text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
              <button
                type="button"
                onClick={closeOverlay}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Esc
              </button>
            </form>

            {/* Body */}
            <div className="max-h-[60vh] overflow-y-auto">
              {q.trim().length < 2 ? (
                <EmptyState message="Type at least 2 characters…" />
              ) : loading ? (
                <EmptyState message="Searching…" />
              ) : total === 0 ? (
                <EmptyState message={`No results for "${q.trim()}"`} />
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {results.profiles.length > 0 && (
                    <Bucket title="People" count={results.profiles.length}>
                      {results.profiles.map(p => (
                        <li key={p.id}><ProfileItem profile={p} onNavigate={closeOverlay} /></li>
                      ))}
                    </Bucket>
                  )}
                  {results.opportunities.length > 0 && (
                    <Bucket title="Opportunities" count={results.opportunities.length}>
                      {results.opportunities.map(o => (
                        <li key={o.id}><OpportunityItem item={o} onNavigate={closeOverlay} /></li>
                      ))}
                    </Bucket>
                  )}
                  {results.grants.length > 0 && (
                    <Bucket title="Grants" count={results.grants.length}>
                      {results.grants.map(g => (
                        <li key={g.id}><GrantItem item={g} onNavigate={closeOverlay} /></li>
                      ))}
                    </Bucket>
                  )}
                  {results.marketplace_listings.length > 0 && (
                    <Bucket title="Marketplace" count={results.marketplace_listings.length}>
                      {results.marketplace_listings.map(m => (
                        <li key={m.id}><MarketplaceItem item={m} onNavigate={closeOverlay} /></li>
                      ))}
                    </Bucket>
                  )}
                  {results.businesses.length > 0 && (
                    <Bucket title="Businesses" count={results.businesses.length}>
                      {results.businesses.map(b => (
                        <li key={b.id}><BusinessItem item={b} onNavigate={closeOverlay} /></li>
                      ))}
                    </Bucket>
                  )}
                </div>
              )}
            </div>

            {/* Footer — "See all" jump */}
            {q.trim().length >= 2 && (
              <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">
                  <kbd className="font-mono text-[10px] border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5 mr-1">↵</kbd>
                  to see all results
                </span>
                <Link
                  href={`/search?q=${encodeURIComponent(q.trim())}`}
                  onClick={closeOverlay}
                  className="font-semibold text-green-700 dark:text-green-400 hover:underline"
                >
                  Open search page →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-500">
      {message}
    </div>
  )
}

function Bucket({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <p className="px-4 py-2 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-800/40">
        {title} · {count}
      </p>
      <ul>{children}</ul>
    </div>
  )
}

function ProfileItem({ profile: p, onNavigate }: { profile: SearchProfile; onNavigate: () => void }) {
  const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unnamed member'
  const href = p.username ? `/u/${p.username}` : `/directory/${p.id}`
  const subtitle = [p.role, p.institution].filter(Boolean).join(' · ')
  return (
    <Link href={href} onClick={onNavigate} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      {p.avatar_url ? (
        <Image src={p.avatar_url} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-100 dark:border-gray-800" />
      ) : (
        <span className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-xs font-bold flex items-center justify-center shrink-0">
          {(p.first_name?.[0] || '?').toUpperCase()}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{name}</p>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>}
      </div>
    </Link>
  )
}

function OpportunityItem({ item: o, onNavigate }: { item: SearchOpportunity; onNavigate: () => void }) {
  const subtitle = [o.type, o.organisation].filter(Boolean).join(' · ')
  return (
    <Link href={`/opportunities/${o.id}`} onClick={onNavigate} className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <span className="text-base mt-0.5">🚀</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{o.title}</p>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>}
      </div>
    </Link>
  )
}

function GrantItem({ item: g, onNavigate }: { item: SearchGrant; onNavigate: () => void }) {
  const subtitle = [g.funder, g.category].filter(Boolean).join(' · ')
  return (
    <Link href={`/grants/${g.id}`} onClick={onNavigate} className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <span className="text-base mt-0.5">💰</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{g.title}</p>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>}
      </div>
    </Link>
  )
}

function MarketplaceItem({ item: m, onNavigate }: { item: SearchMarketplaceListing; onNavigate: () => void }) {
  const subtitle = [m.category, m.state].filter(Boolean).join(' · ')
  return (
    <Link href={`/marketplace/${m.id}`} onClick={onNavigate} className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <span className="text-base mt-0.5">🛒</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{m.title}</p>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>}
      </div>
      {m.price != null && (
        <span className="text-xs font-semibold text-green-700 dark:text-green-400 shrink-0 ml-2">
          ₦{m.price.toLocaleString('en-NG')}
        </span>
      )}
    </Link>
  )
}

function BusinessItem({ item: b, onNavigate }: { item: SearchBusiness; onNavigate: () => void }) {
  const href = b.slug ? `/b/${b.slug}` : `/businesses`
  const subtitle = [b.sector, b.state].filter(Boolean).join(' · ')
  return (
    <Link href={href} onClick={onNavigate} className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <span className="text-base mt-0.5">🏢</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{b.name}</p>
          {b.is_verified && (
            <span className="text-[10px] font-bold text-green-700 dark:text-green-400">✓</span>
          )}
        </div>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>}
      </div>
    </Link>
  )
}
