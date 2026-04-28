'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * In-page search form shown at the top of /search. Mirrors the current
 * query so refining the search feels like editing the existing one, not
 * starting over. The AppNav search bar is a separate surface — this one
 * is specifically for the results page.
 */
export default function SearchForm({ initialQuery }: { initialQuery: string }) {
  const router = useRouter()
  const [q, setQ] = useState(initialQuery)

  // When the URL's q changes (e.g. back/forward nav), resync local state.
  useEffect(() => {
    setQ(initialQuery)
  }, [initialQuery])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = q.trim()
    if (trimmed.length < 2) return
    router.push(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <svg
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        type="search"
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Search people, opportunities, grants, listings, businesses…"
        maxLength={100}
        autoFocus
        className="w-full text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl pl-9 pr-28 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
      />
      <button
        type="submit"
        disabled={q.trim().length < 2}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-sm font-semibold bg-green-600 text-white px-4 py-1.5 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Search
      </button>
    </form>
  )
}
