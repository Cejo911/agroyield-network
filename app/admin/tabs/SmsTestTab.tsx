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

/** Delivery status looked up from Termii after the send. */
interface DeliveryStatus {
  messageId: string
  success: boolean
  /** Normalised: queued | sent | delivered | failed | unknown */
  status: string
  rawStatus: string | null
  reason: string | null
  error: string | null
}

interface LastResult {
  ok: boolean
  at: string
  recipients?: number
  successCount?: number
  failureCount?: number
  results?: RecipientResult[]
  /** Keyed by messageId — populated by the Check delivery button. */
  delivery?: Record<string, DeliveryStatus>
  deliveryLoading?: boolean
  deliveryError?: string
  error?: string
}

type SmsChannel = 'generic' | 'dnd' | 'whatsapp'
const CHANNEL_OPTIONS: { value: '' | SmsChannel; label: string; hint: string }[] = [
  { value: '',         label: 'Default (env config)', hint: 'Use TERMII_SMS_CHANNEL' },
  { value: 'generic',  label: 'Generic',              hint: 'Cheapest · dropped for DND-listed numbers' },
  { value: 'dnd',      label: 'DND',                  hint: 'Reaches DND-listed numbers · costs more' },
  { value: 'whatsapp', label: 'WhatsApp',             hint: 'Rarely used for plain SMS' },
]

export default function SmsTestTab() {
  const [to, setTo] = useState('')
  const [message, setMessage] = useState('AgroYield test: your SMS pipeline is live.')
  const [senderOverride, setSenderOverride] = useState('')
  const [channelOverride, setChannelOverride] = useState<'' | SmsChannel>('')
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
          // Omit channel when empty so the server falls back to env config
          // instead of receiving a literal "" and failing validation.
          channel: channelOverride || undefined,
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

  /**
   * Poll Termii for the carrier-side delivery status of every messageId
   * in the current result panel. Runs as a single batch request so the
   * admin sees all N statuses at once instead of them trickling in.
   *
   * Termii's status reporting is near-realtime on delivery (sub-second
   * for most carriers) but can lag 10-30s on rejection, so we don't
   * auto-poll — admin clicks when they want a fresh read.
   */
  async function checkDelivery() {
    if (!last?.results) return
    const ids = last.results
      .filter(r => r.success && r.messageId)
      .map(r => r.messageId as string)
    if (ids.length === 0) return

    setLast(prev => prev && { ...prev, deliveryLoading: true, deliveryError: undefined })

    try {
      const res = await fetch(
        `/api/admin/sms/test/status?ids=${encodeURIComponent(ids.join(','))}`,
        { method: 'GET' },
      )
      const json = await res.json()

      if (!res.ok) {
        setLast(prev => prev && {
          ...prev,
          deliveryLoading: false,
          deliveryError: json.error || `HTTP ${res.status}`,
        })
        return
      }

      // Index by messageId for O(1) lookup during render.
      const deliveryMap: Record<string, DeliveryStatus> = {}
      for (const d of (json.results as DeliveryStatus[]) || []) {
        deliveryMap[d.messageId] = d
      }

      setLast(prev => prev && {
        ...prev,
        deliveryLoading: false,
        delivery: deliveryMap,
      })
    } catch (err) {
      setLast(prev => prev && {
        ...prev,
        deliveryLoading: false,
        deliveryError: err instanceof Error ? err.message : 'Network error',
      })
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

        {/* Sender ID + channel on one row so the form doesn't grow too tall.
            Both are power-user overrides — collapsed hint captions keep the
            rail compact while still telling the admin what they do. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Channel <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <select
              value={channelOverride}
              onChange={(e) => setChannelOverride(e.target.value as '' | SmsChannel)}
              className={`${sInput} w-full`}
            >
              {CHANNEL_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
              {CHANNEL_OPTIONS.find(o => o.value === channelOverride)?.hint ?? ''}
            </p>
          </div>
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
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="font-medium">
                  {last.failureCount === 0
                    ? `✓ Sent to all ${last.successCount} recipient${last.successCount === 1 ? '' : 's'}`
                    : last.successCount === 0
                      ? `✗ All ${last.failureCount} sends failed`
                      : `⚠ ${last.successCount} sent · ${last.failureCount} failed`}
                </div>
                {/* "Check delivery" is only useful when we have at least one
                    successful messageId to look up. Hidden otherwise to
                    avoid a button that would always return empty. */}
                {(last.successCount ?? 0) > 0 && (
                  <button
                    type="button"
                    onClick={checkDelivery}
                    disabled={last.deliveryLoading}
                    className="text-xs px-2.5 py-1 rounded border border-current/20 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Ask Termii whether the carrier actually delivered each SMS. Termii can accept a send that the carrier later drops (DND, sender ID not whitelisted, etc.)."
                  >
                    {last.deliveryLoading ? 'Checking…' : last.delivery ? '↻ Refresh delivery' : 'Check delivery'}
                  </button>
                )}
              </div>

              {last.deliveryError && (
                <div className="mt-2 text-xs text-red-700 dark:text-red-400">
                  Delivery check failed: {last.deliveryError}
                </div>
              )}

              <div className="mt-2 space-y-1">
                {last.results.map((r, i) => {
                  const d = r.messageId ? last.delivery?.[r.messageId] : undefined
                  return (
                    <div
                      key={`${r.input}-${i}`}
                      className={`text-xs font-mono flex items-start gap-2 flex-wrap ${
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
                      {/* Delivery pill — only shown once checkDelivery has
                          populated the map. Colour-coded so the admin can
                          eyeball the column: green=delivered, blue=sent
                          (handed to carrier, not yet confirmed on handset),
                          red=failed (carrier rejected), gray=queued/unknown. */}
                      {d && (
                        <DeliveryPill status={d.status} rawStatus={d.rawStatus} reason={d.reason} />
                      )}
                    </div>
                  )
                })}
              </div>

              {last.delivery && (
                <p className="mt-2 text-[11px] opacity-70">
                  Delivery pills reflect Termii&apos;s last report — a pending row may take up to ~30s to flip to delivered/failed.
                </p>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}

/**
 * Small colour-coded pill showing the carrier-side delivery status.
 * Hover reveals Termii's raw status string + any rejection reason so
 * the admin can grep the Termii dashboard if something looks off.
 */
function DeliveryPill({
  status,
  rawStatus,
  reason,
}: {
  status: string
  rawStatus: string | null
  reason: string | null
}) {
  const cls =
    status === 'delivered'
      ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800'
      : status === 'sent'
        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800'
        : status === 'failed'
          ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800'
          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700'

  const tooltip = [
    rawStatus ? `Termii status: ${rawStatus}` : null,
    reason ? `Reason: ${reason}` : null,
  ]
    .filter(Boolean)
    .join(' · ') || 'No extra detail from Termii'

  return (
    <span
      title={tooltip}
      className={`text-[10px] font-sans font-medium px-1.5 py-0.5 rounded border ${cls}`}
    >
      {status}
      {status === 'failed' && reason ? ` · ${reason}` : ''}
    </span>
  )
}
