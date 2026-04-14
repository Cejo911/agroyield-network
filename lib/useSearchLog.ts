'use client'
import { useEffect, useRef } from 'react'

/**
 * Logs a search query after a debounce period.
 * Call this hook in any component with a search input.
 *
 * @param query   - The current search string
 * @param module  - Which module the search is in (e.g. 'marketplace')
 * @param resultsCount - Number of results the search returned
 * @param delay   - Debounce delay in ms (default 1500)
 */
export function useSearchLog(query: string, module: string, resultsCount: number, delay = 1500) {
  const lastLogged = useRef('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Clear pending timer on every keystroke
    if (timer.current) clearTimeout(timer.current)

    const trimmed = query.trim()

    // Don't log empty, very short, or already-logged queries
    if (trimmed.length < 2 || trimmed === lastLogged.current) return

    timer.current = setTimeout(() => {
      lastLogged.current = trimmed

      // Fire and forget — never block UI
      fetch('/api/search-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed, module, results_count: resultsCount }),
      }).catch(() => {})
    }, delay)

    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [query, module, resultsCount, delay])
}
