'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

/**
 * Dismissible amber banner that surfaces a deferred warning from the
 * new-invoice flow — specifically, when the recurring template POST
 * fails AFTER the main invoice already persisted and the form navigated
 * to /business/invoices/[id].
 *
 * The new-invoice page stashes a message in sessionStorage under
 * `recurring_create_warning`; we pick it up here on mount, show it once,
 * and then clear the key so a reload doesn't re-show it.
 *
 * This exists because the new-invoice handler used to swallow non-2xx
 * responses with a bare `catch` block — users would tick "Make this
 * recurring", see the invoice get created, and never learn that the
 * schedule never saved (e.g. feature flag off, tier gate, rate limit).
 */
export default function RecurringCreateWarning() {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('recurring_create_warning')
      if (stored) {
        // setMessage from a synchronous read of sessionStorage is the
        // canonical "hydrate from external store" pattern for this banner.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMessage(stored)
        sessionStorage.removeItem('recurring_create_warning')
      }
    } catch {
      // sessionStorage can be unavailable in some embedded contexts — no-op.
    }
  }, [])

  if (!message) return null

  return (
    <div className="mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 flex items-start gap-3">
      <span className="text-amber-600 dark:text-amber-400 text-lg leading-none">⚠️</span>
      <div className="flex-1 text-sm text-amber-800 dark:text-amber-300">
        {message}
        <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
          Your invoice is saved. You can retry the recurring schedule from{' '}
          <Link href="/business/invoices/recurring" className="underline font-medium">
            Recurring Invoices
          </Link>
          .
        </p>
      </div>
      <button
        type="button"
        onClick={() => setMessage(null)}
        className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 text-sm leading-none"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}
