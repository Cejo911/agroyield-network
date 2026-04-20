'use client'
import { useState, useEffect, useCallback } from 'react'

/**
 * SMS Test admin panel — super admin only.
 *
 * Fires a single plain-text SMS through the Termii provider so we can
 * verify the AgroYield sender ID, API key, and channel config before
 * wiring SMS into production flows (OTP, notifications, etc.).
 *
 * Shows wallet balance on mount so the admin knows there's credit.
 * Every send is audit-logged server-side with a masked phone number.
 */

const sInput = 'border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500'

interface BalanceState {
  senderId: string
  channel: string
  balance: number | null
  currency: string | null
  balanceError: string | null
}

interface LastResult {
  ok: boolean
  at: string
  to?: string
  messageId?: string
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
    if (!to.trim() || !message.trim()) return
    setSending(true)
    setLast(null)
    try {
      const res = await fetch('/api/admin/sms/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: to.trim(),
          message: message.trim(),
          senderId: senderOverride.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (res.ok) {
        setLast({
          ok: true,
          at: new Date().toISOString(),
          to: json.to,
          messageId: json.messageId,
        })
        // Refresh balance after a successful send
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
          Fire a single plain-text SMS through Termii to verify the AgroYield sender ID and API credentials.
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
            Recipient phone
          </label>
          <input
            type="tel"
            inputMode="tel"
            placeholder="+2348012345678 or 08012345678"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={`${sInput} w-full`}
          />
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
            E.164 (+234…) or local format — we normalise to Nigeria on submit.
          </p>
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
            disabled={sending || !to.trim() || !message.trim() || message.length > 918}
            className="px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
          >
            {sending ? 'Sending…' : 'Send test SMS'}
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
              ? 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 text-green-800 dark:text-green-300'
              : 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 text-red-800 dark:text-red-300'
          }`}
        >
          {last.ok ? (
            <>
              <div className="font-medium">✓ Sent to {last.to}</div>
              {last.messageId && (
                <div className="text-xs mt-1 font-mono opacity-80">message_id: {last.messageId}</div>
              )}
            </>
          ) : (
            <>
              <div className="font-medium">✗ Send failed</div>
              <div className="text-xs mt-1 opacity-80">{last.error}</div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
