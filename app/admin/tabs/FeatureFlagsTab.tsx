'use client'
import { useState, useEffect, useCallback } from 'react'

/**
 * Feature Flags admin UI — super admin only.
 *
 * Each flag supports:
 *  - Global on/off (is_enabled)
 *  - Percentage rollout (0–100)
 *  - Per-user allowlist (UUIDs)
 *  - Per-business allowlist (UUIDs)
 *
 * Changes propagate within 60s via the reader's in-memory cache.
 *
 * NOTE: Global infrastructure toggles (cron enablement, digests, etc.) live
 * in the Settings tab. This panel is for per-user/per-business feature
 * targeting and rollouts only.
 */

interface FeatureFlag {
  key: string
  description: string | null
  is_enabled: boolean
  enabled_for_users: string[]
  enabled_for_businesses: string[]
  rollout_percentage: number
  updated_at: string
}

const sInput = 'border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500'

// Helpers to convert between an array of UUIDs and a textarea-friendly string
const arrToText = (arr: string[]) => arr.join('\n')
const textToArr = (t: string) =>
  t
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

function fmtUpdated(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export default function FeatureFlagsTab({
  initialFlags,
}: {
  initialFlags: FeatureFlag[]
}) {
  const [flags, setFlags] = useState<FeatureFlag[]>(initialFlags)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, Partial<FeatureFlag> & {
    users_text?: string
    businesses_text?: string
  }>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState<{ text: string; color: 'green' | 'red' } | null>(null)

  const refetch = useCallback(async () => {
    const res = await fetch('/api/admin/feature-flags', { cache: 'no-store' })
    if (!res.ok) return
    const { flags } = await res.json() as { flags: FeatureFlag[] }
    setFlags(flags)
  }, [])

  // Clear toast after 3s
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const getDraft = (key: string): Partial<FeatureFlag> & { users_text?: string; businesses_text?: string } => {
    const existing = drafts[key]
    if (existing) return existing
    const flag = flags.find(f => f.key === key)
    if (!flag) return {}
    return {
      is_enabled: flag.is_enabled,
      rollout_percentage: flag.rollout_percentage,
      users_text: arrToText(flag.enabled_for_users ?? []),
      businesses_text: arrToText(flag.enabled_for_businesses ?? []),
    }
  }

  const setDraft = (key: string, patch: Partial<FeatureFlag> & { users_text?: string; businesses_text?: string }) => {
    setDrafts(prev => ({ ...prev, [key]: { ...getDraft(key), ...patch } }))
  }

  const hasChanges = (key: string): boolean => {
    const draft = drafts[key]
    if (!draft) return false
    const flag = flags.find(f => f.key === key)
    if (!flag) return false
    if (draft.is_enabled !== undefined && draft.is_enabled !== flag.is_enabled) return true
    if (draft.rollout_percentage !== undefined && draft.rollout_percentage !== flag.rollout_percentage) return true
    if (draft.users_text !== undefined && arrToText(flag.enabled_for_users ?? []) !== draft.users_text) return true
    if (draft.businesses_text !== undefined && arrToText(flag.enabled_for_businesses ?? []) !== draft.businesses_text) return true
    return false
  }

  const saveFlag = async (key: string) => {
    const draft = drafts[key]
    if (!draft) return
    setSaving(prev => ({ ...prev, [key]: true }))
    try {
      const payload: Record<string, unknown> = { key }
      if (draft.is_enabled !== undefined)         payload.is_enabled = draft.is_enabled
      if (draft.rollout_percentage !== undefined) payload.rollout_percentage = draft.rollout_percentage
      if (draft.users_text !== undefined)         payload.enabled_for_users = textToArr(draft.users_text)
      if (draft.businesses_text !== undefined)    payload.enabled_for_businesses = textToArr(draft.businesses_text)

      const res = await fetch('/api/admin/feature-flags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Save failed' }))
        setToast({ text: `Save failed: ${error}`, color: 'red' })
        return
      }
      setToast({ text: `Saved "${key}" — propagates in ~60s`, color: 'green' })
      setDrafts(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      await refetch()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setToast({ text: `Save failed: ${message}`, color: 'red' })
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }))
    }
  }

  // Quick-toggle global enable without opening the row
  const quickToggle = async (flag: FeatureFlag) => {
    setSaving(prev => ({ ...prev, [flag.key]: true }))
    try {
      const res = await fetch('/api/admin/feature-flags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: flag.key, is_enabled: !flag.is_enabled }),
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Toggle failed' }))
        setToast({ text: `Toggle failed: ${error}`, color: 'red' })
        return
      }
      setToast({ text: `${flag.key} is now ${!flag.is_enabled ? 'ON' : 'OFF'} globally`, color: 'green' })
      await refetch()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setToast({ text: `Toggle failed: ${message}`, color: 'red' })
    } finally {
      setSaving(prev => ({ ...prev, [flag.key]: false }))
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Feature Flags</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Per-user and per-business feature targeting. Changes propagate within ~60s.
          For global infrastructure toggles (crons, digest on/off), use the Settings tab.
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`mb-4 px-4 py-2 rounded-md text-sm ${
          toast.color === 'green'
            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
        }`}>
          {toast.text}
        </div>
      )}

      {/* Flag rows */}
      <div className="space-y-2">
        {flags.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No feature flags found. Run the <code>20260417_feature_flags.sql</code> migration.
          </p>
        )}
        {flags.map((flag) => {
          const isExpanded = expandedKey === flag.key
          const draft = getDraft(flag.key)
          const isGlobalOn = draft.is_enabled ?? flag.is_enabled
          const rollout = draft.rollout_percentage ?? flag.rollout_percentage
          const changed = hasChanges(flag.key)
          const busy = saving[flag.key] === true
          const userCount = (flag.enabled_for_users ?? []).length
          const bizCount = (flag.enabled_for_businesses ?? []).length

          return (
            <div key={flag.key}
              className={`border rounded-lg overflow-hidden ${
                flag.is_enabled
                  ? 'border-green-300 dark:border-green-800'
                  : 'border-gray-200 dark:border-gray-800'
              }`}>
              {/* Header row — quick-toggle + expand */}
              <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Quick toggle */}
                  <button
                    onClick={() => quickToggle(flag)}
                    disabled={busy}
                    title={flag.is_enabled ? 'Click to disable globally' : 'Click to enable globally'}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                      flag.is_enabled ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
                    } ${busy ? 'opacity-50' : ''}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      flag.is_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-sm font-semibold text-gray-900 dark:text-gray-100">{flag.key}</code>
                      {flag.is_enabled && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                          GLOBAL ON
                        </span>
                      )}
                      {!flag.is_enabled && flag.rollout_percentage > 0 && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
                          {flag.rollout_percentage}% rollout
                        </span>
                      )}
                      {userCount > 0 && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                          {userCount} {userCount === 1 ? 'user' : 'users'}
                        </span>
                      )}
                      {bizCount > 0 && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                          {bizCount} {bizCount === 1 ? 'business' : 'businesses'}
                        </span>
                      )}
                    </div>
                    {flag.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{flag.description}</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setExpandedKey(isExpanded ? null : flag.key)}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 ml-2 flex-shrink-0">
                  {isExpanded ? 'Close' : 'Edit'}
                </button>
              </div>

              {/* Expanded editor */}
              {isExpanded && (
                <div className="px-4 py-4 space-y-4 bg-gray-50 dark:bg-gray-900/60 border-t border-gray-200 dark:border-gray-800">
                  {/* Global toggle (same as header, but clearer) */}
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm mb-1">Global</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      When ON, the flag is enabled for everyone regardless of rollout/allowlists.
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setDraft(flag.key, { is_enabled: !isGlobalOn })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          isGlobalOn ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
                        }`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          isGlobalOn ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {isGlobalOn ? 'Enabled for everyone' : 'Disabled globally'}
                      </span>
                    </div>
                  </div>

                  <hr className="border-gray-200 dark:border-gray-800" />

                  {/* Rollout percentage */}
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm mb-1">Percentage rollout</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      Deterministically enables the flag for this fraction of users, bucketed by user ID hash.
                      Ignored when Global is ON.
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={rollout}
                        onChange={(e) => setDraft(flag.key, { rollout_percentage: Number(e.target.value) })}
                        className="flex-1 accent-green-600"
                      />
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={rollout}
                        onChange={(e) => setDraft(flag.key, {
                          rollout_percentage: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                        })}
                        className={`w-20 ${sInput}`}
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">%</span>
                    </div>
                  </div>

                  <hr className="border-gray-200 dark:border-gray-800" />

                  {/* Per-user allowlist */}
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm mb-1">User allowlist</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      One profile UUID per line (or comma-separated). These users always get the flag.
                    </p>
                    <textarea
                      value={draft.users_text ?? ''}
                      onChange={(e) => setDraft(flag.key, { users_text: e.target.value })}
                      rows={3}
                      spellCheck={false}
                      placeholder="e.g. 1a2b3c4d-5e6f-7890-1234-56789abcdef0"
                      className={`w-full font-mono text-xs ${sInput}`}
                    />
                  </div>

                  <hr className="border-gray-200 dark:border-gray-800" />

                  {/* Per-business allowlist */}
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm mb-1">Business allowlist</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      One business UUID per line (or comma-separated). All members of these businesses get the flag.
                    </p>
                    <textarea
                      value={draft.businesses_text ?? ''}
                      onChange={(e) => setDraft(flag.key, { businesses_text: e.target.value })}
                      rows={3}
                      spellCheck={false}
                      placeholder="e.g. 1a2b3c4d-5e6f-7890-1234-56789abcdef0"
                      className={`w-full font-mono text-xs ${sInput}`}
                    />
                  </div>

                  {/* Footer: save + last-updated */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-800">
                    <span className="text-xs text-gray-500 dark:text-gray-500">
                      Last updated {fmtUpdated(flag.updated_at)}
                    </span>
                    <div className="flex items-center gap-2">
                      {changed && (
                        <button
                          onClick={() => setDrafts(prev => {
                            const next = { ...prev }
                            delete next[flag.key]
                            return next
                          })}
                          className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 px-3 py-1.5">
                          Discard
                        </button>
                      )}
                      <button
                        onClick={() => saveFlag(flag.key)}
                        disabled={!changed || busy}
                        className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                          changed && !busy
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-500 cursor-not-allowed'
                        }`}>
                        {busy ? 'Saving…' : 'Save changes'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
