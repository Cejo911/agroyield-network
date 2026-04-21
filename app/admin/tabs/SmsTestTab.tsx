'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'

/**
 * SMS Test admin panel — super admin only.
 *
 * Fires plain-text SMS through the Termii provider so we can verify the
 * AgroYield sender ID, API key, and channel config before wiring SMS into
 * production flows (OTP, notifications, etc.).
 *
 * Accepts one OR multiple recipients in a single send. Separators: comma,
 * semicolon, newline, tab. Server caps at 10 numbers per send to protect
 * the wallet from thumb-slips. Each recipient gets its own success/failure
 * line in the result panel.
 *
 * Shows wallet balance on mount so the admin knows there's credit.
 * Every send is audit-logged server-side with masked phone numbers.
 */

const sInput = 'border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500'

// Mirrors the server-side splitter — kept in lockstep with
// lib/messaging/utils/phone.ts → splitPhoneCandidates. Duplicating the regex
// rather than importing from /lib because this file is a client component
// and we want zero bundle impact from server utils.
const SEPARATOR_RE = /[,;\n\r\t]+/

function parseCandidates(raw: string): string[] {
  if (!raw) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const chunk of raw.split(SEPARATOR_RE)) {
    const trimmed = chunk.trim()
    if (!trimmed) continue
    if (seen.has(trimmed)) continue
    seen.add(trimmed)
    out.push(trimmed)
  }
  return out
}

const MAX_RECIPIENTS = 10

interface BalanceState {
  senderId: string
  channel: string
  balance: number | null
  currency: string | null
  balanceError: string | null
}

interface RecipientResult {
  input: string
  to: string | null
  success: boolean
  messageId?: string
  error?: string
}

interface LastResult {
  ok: boolean
  at: string
  recipients?: number
  successCount?: number
  failureCount?: number
  results?: RecipientResult[]
  error?: string
}

export default function SmsTestTab() {
  const [to, setTo] = useState('')
  const [message, setMessage] = useState('AgroYield test: your SMS pipeline is live.')
  const [senderOverride, setSenderOverride] = useState('')
  const [sending, setSending] = useState(false)
  const [info, setInfo] = useState<BalanceState | null>(null)
  const [infoLoading, setInfoLoading] = useState(true)
  const [last, setLast] = useState<LastResult | null>(null)

  // Parsed candidate list — drives the preview chips + send button state.
  // useMemo because the textarea's onChange fires on every keystroke and
  // we don't need to re-parse when other state changes.
  const candidates = useMemo(() => parseCandidates(to), [to])
  const tooMany = candidates.length > MAX_RECIPIENTS

  const refreshBalance = useCallback(async () => {
    setInfoLoading(true)
    try {
      const res = await fetch('/api/admin/sms/test', { method: 'GET' })
      const json = await res.json()
      if (res.ok) {
        setInfo({
          senderId: json.senderId,
          channel: json.channel,
          balance: json.balance,
          currency: json.currency,
          balanceError: json.balanceError,
        })
      } else {
        setInfo({
          senderId: '—',
          channel: '—',
          balance: null,
          currency: null,
          balanceError: json.error || 'Failed to load',
        })
      }
    } finally {
      setInfoLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshBalance()
  }, [refreshBalance])

  const segmentsUsed = Math.max(1, Math.ceil(message.length / 160))

  async function handleSend() {
    if (candidates.length === 0 || !message.trim() || tooMany) return
    setSending(true)
    setLast(null)
    try {
      const res = await fetch('/api/admin/sms/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Send the raw string — the API parses separators server-side too,
          // which keeps the source of truth on one side of the wire.
          to: to.trim(),
          message: message.trim(),
          senderId: senderOverride.trim() || undefined,
        }),
      })
      const json = await res.json()
      // Partial failures return 200 with ok=true and a results array; total
      // failures return 502 with ok=false; hard errors (auth, 400) return
      // { error } only. Handle all three.
      if (res.ok || Array.isArray(json.results)) {
        setLast({
          ok: !!json.ok,
          at: new Date().toISOString(),
          recipients: json.recipients,
          successCount: json.successCount,
          failureCount: json.failureCount,
          results: json.results,
        })
        refreshBalance()
      } else {
        setLast({
          ok: false,
          at: new Date().toISOString(),
          error: json.error || `HTTP ${res.status}`,
        })
      }
    } catch (err) {
      setLast({
        ok: false,
        at: new Date().toISOString(),
        error: err instanceof Error ? err.message : 'Network error',
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">SMS Test — Termii</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Fire a plain-text SMS through Termii to verify the AgroYield sender ID and API credentials.
          Supports one recipient or up to {MAX_RECIPIENTS} per send.
        </p>
      </div>

      {/* Config + balance strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 bg-white dark:bg-gray-900">
          <div className="text-[11px] uppercase text-gray-500 dark:text-gray-400 tracking-wide">Sender ID</div>
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
            {infoLoading ? '…' : info?.senderId || '—'}
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 bg-white dark:bg-gray-900">
          <div className="text-[11px] uppercase text-gray-500 dark:text-gray-400 tracking-wide">Channel</div>
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
            {infoLoading ? '…' : info?.channel || '—'}
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase text-gray-500 dark:text-gray-400 tracking-wide">Wallet</div>
            <button
              onClick={refreshBalance}
              disabled={infoLoading}
              className="text-[11px] text-green-600 hover:text-green-500 disabled:opacity-50"
            >
              ↻ Refresh
            </button>
          </div>
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
            {infoLoading
              ? '…'
              : info?.balanceError
                ? <span className="text-red-600 text-xs">{info.balanceError}</span>
                : `${info?.balance ?? 0} ${info?.currency ?? ''}`}
          </div>
        </div>
      </div>

      {/* Send form */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900 space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Recipient phone{candidates.length > 1 ? 's' : ''}
          </label>
          <textarea
            inputMode="tel"
            placeholder="+2348012345678, 08087654321, 2349012345678&#10;Comma, newline, or semicolon between numbers"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            rows={Math.min(4, Math.max(1, candidates.length))}
            className={`${sInput} w-full resize-none font-mono`}
          />
          <div className="flex items-center justify-between mt-1 gap-3">
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              E.164 (+234…) or local format. Separate multiple numbers with comma, semicolon, or newline.
            </p>
            <p className={`text-[11px] whitespace-nowrap ${
              tooMany
                ? 'text-red-600 font-medium'
                : candidates.length > 0
                  ? 'text-green-600 dark:text-green-400 font-medium'
                  : 'text-gray-400'
            }`}>
              {candidates.length === 0
                ? 'No numbers'
                : tooMany
                  ? `${candidates.length} numbers — max ${MAX_RECIPIENTS}`
                  : `${candidates.length} number${candidates.length === 1 ? '' : 's'} parsed`}
            </p>
          </div>
          {/* Preview chips — visible only when 2+ numbers so single-recipient
              sends don't grow a useless UI element. Helps the admin eyeball
              their list for typos before firing. */}
          {candidates.length > 1 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {candidates.map((c, i) => (
                <span
                  key={`${c}-${i}`}
                  className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                    i >= MAX_RECIPIENTS
                      ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 line-through'
                      : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Message body
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className={`${sInput} w-full resize-none`}
          />
          <div className="flex items-center justify-between mt-1 text-[11px] text-gray-500 dark:text-gray-400">
            <span>{message.length} chars · {segmentsUsed} segment{segmentsUsed === 1 ? '' : 's'}</span>
            {message.length > 918 && (
              <span className="text-red-600">Too long — max 918 chars / 6 segments</span>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Sender ID override <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            placeholder={info?.senderId || 'AgroYield'}
            value={senderOverride}
            onChange={(e) => setSenderOverride(e.target.value)}
            className={`${sInput} w-full`}
          />
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
            Leave blank to use the env-configured sender ID.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSend}
            disabled={sending || candidates.length === 0 || tooMany || !message.trim() || message.length > 918}
            className="px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
          >
            {sending
              ? 'Sending…'
              : candidates.length > 1
                ? `Send test SMS to ${candidates.length} recipients`
                : 'Send test SMS'}
          </button>
          <span className="text-[11px] text-gray-500 dark:text-gray-400">
            Limit: 5 sends/min per admin · every send is audit-logged
          </span>
        </div>
      </div>

      {/* Last result */}
      {last && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            last.ok
              ? last.failureCount && last.failureCount > 0
                ? 'border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                : 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 text-green-800 dark:text-green-300'
              : 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 text-red-800 dark:text-red-300'
          }`}
        >
          {last.error ? (
            <>
              <div className="font-medium">✗ Send failed</div>
              <div className="text-xs mt-1 opacity-80">{last.error}</div>
            </>
          ) : last.results ? (
            <>
              <div className="font-medium">
                {last.failureCount === 0
                  ? `✓ Sent to all ${last.successCount} recipient${last.successCount === 1 ? '' : 's'}`
                  : last.successCount === 0
                    ? `✗ All ${last.failureCount} sends failed`
                    : `⚠ ${last.successCount} sent · ${last.failureCount} failed`}
              </div>
              <div className="mt-2 space-y-1">
                {last.results.map((r, i) => (
                  <div
                    key={`${r.input}-${i}`}
                    className={`text-xs font-mono flex items-start gap-2 ${
                      r.success ? 'opacity-90' : 'text-red-700 dark:text-red-400'
                    }`}
                  >
                    <span className="flex-shrink-0">{r.success ? '✓' : '✗'}</span>
                    <span className="flex-shrink-0 whitespace-nowrap">
                      {r.to ?? r.input}
                    </span>
                    {r.success && r.messageId && (
                      <span className="opacity-70 truncate">id: {r.messageId}</span>
                    )}
                    {!r.success && r.error && (
                      <span className="opacity-90">— {r.error}</span>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}
