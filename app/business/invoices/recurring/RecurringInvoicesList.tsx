'use client'
import { useState } from 'react'

export interface RecurringRow {
  id: string
  customer_id: string
  customerName: string
  cadence: 'weekly' | 'monthly' | 'quarterly'
  status: 'active' | 'paused' | 'ended'
  start_on: string
  next_run_on: string
  last_run_on: string | null
  end_on: string | null
  generated_count: number
  last_error: string | null
}

/**
 * Client-side list + controls for recurring invoice templates.
 *
 * Optimistic state: we flip status locally on the expected outcome so the
 * UI feels snappy. On server error, we revert and surface the message.
 */
export default function RecurringInvoicesList({
  initialRows,
}: {
  initialRows: RecurringRow[]
}) {
  const [rows, setRows] = useState<RecurringRow[]>(initialRows)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function runAction(id: string, action: 'pause' | 'resume' | 'end') {
    setBusyId(id)
    setError(null)

    const expectedStatus =
      action === 'pause' ? 'paused'
      : action === 'resume' ? 'active'
      : 'ended'

    // Optimistic update
    const previous = rows
    setRows(rows.map(r =>
      r.id === id ? { ...r, status: expectedStatus } : r
    ))

    try {
      const res = await fetch('/api/recurring-invoices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Request failed (${res.status})`)
      }
    } catch (err) {
      // Revert
      setRows(previous)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {rows.map(r => (
          <RecurringCard
            key={r.id}
            row={r}
            busy={busyId === r.id}
            onAction={(action) => runAction(r.id, action)}
          />
        ))}
      </div>
    </div>
  )
}

function RecurringCard({
  row,
  busy,
  onAction,
}: {
  row: RecurringRow
  busy: boolean
  onAction: (action: 'pause' | 'resume' | 'end') => void
}) {
  const cadenceLabel =
    row.cadence === 'weekly' ? 'Every week'
    : row.cadence === 'monthly' ? 'Every month'
    : 'Every quarter'

  const statusBadge = {
    active:  { label: 'Active',  cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
    paused:  { label: 'Paused',  cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
    ended:   { label: 'Ended',   cls: 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  }[row.status]

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-5">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-gray-900 dark:text-white text-base truncate">{row.customerName}</h3>
            <span className={`text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 whitespace-nowrap ${statusBadge.cls}`}>
              {statusBadge.label}
            </span>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <div><span className="text-gray-500 dark:text-gray-500">Cadence:</span> {cadenceLabel}</div>
            {row.status !== 'ended' && (
              <div>
                <span className="text-gray-500 dark:text-gray-500">Next run:</span>{' '}
                <span className="font-medium text-gray-900 dark:text-white">{formatDate(row.next_run_on)}</span>
              </div>
            )}
            {row.last_run_on && (
              <div><span className="text-gray-500 dark:text-gray-500">Last run:</span> {formatDate(row.last_run_on)}</div>
            )}
            {row.end_on && (
              <div><span className="text-gray-500 dark:text-gray-500">Ends:</span> {formatDate(row.end_on)}</div>
            )}
            <div>
              <span className="text-gray-500 dark:text-gray-500">Generated:</span>{' '}
              <span className="font-medium">{row.generated_count}</span>{' '}
              invoice{row.generated_count === 1 ? '' : 's'} so far
            </div>
            {row.last_error && (
              <div className="mt-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md px-2 py-1.5">
                Last issue: {row.last_error}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap md:flex-nowrap">
          {row.status === 'active' && (
            <button
              type="button"
              onClick={() => onAction('pause')}
              disabled={busy}
              className="text-xs font-semibold text-amber-700 border border-amber-200 bg-amber-50 hover:bg-amber-100 rounded-md px-3 py-1.5 disabled:opacity-50"
            >
              {busy ? '…' : 'Pause'}
            </button>
          )}
          {row.status === 'paused' && (
            <button
              type="button"
              onClick={() => onAction('resume')}
              disabled={busy}
              className="text-xs font-semibold text-green-700 border border-green-200 bg-green-50 hover:bg-green-100 rounded-md px-3 py-1.5 disabled:opacity-50"
            >
              {busy ? '…' : 'Resume'}
            </button>
          )}
          {row.status !== 'ended' && (
            <button
              type="button"
              onClick={() => {
                if (confirm('End this recurring invoice? Existing invoices stay untouched, but no new ones will be generated.')) {
                  onAction('end')
                }
              }}
              disabled={busy}
              className="text-xs font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md px-3 py-1.5 disabled:opacity-50"
            >
              End
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}
