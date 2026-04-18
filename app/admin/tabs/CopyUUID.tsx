'use client'
import { useState } from 'react'

/**
 * Inline UUID display with copy-to-clipboard.
 *
 * Use anywhere an admin might need to grab a record's UUID — feature flag
 * allowlists, cron/digest debugging, audit-log cross-referencing, etc.
 *
 * Truncates long UUIDs visually (first-8…last-4) while the full value
 * copies on click. Feedback: button flashes "Copied!" for ~1.2s.
 *
 * Props:
 *   value   — the UUID (or any short string) to render and copy
 *   label   — small leading label (default: "ID")
 *   full    — set true to show the full UUID without truncation
 */

interface Props {
  value: string | null | undefined
  label?: string
  full?: boolean
  className?: string
}

function truncate(uuid: string): string {
  if (uuid.length <= 14) return uuid
  return `${uuid.slice(0, 8)}…${uuid.slice(-4)}`
}

export default function CopyUUID({ value, label = 'ID', full = false, className = '' }: Props) {
  const [copied, setCopied] = useState(false)

  if (!value) return null
  const display = full ? value : truncate(value)

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      // Silent fallback — some browsers block clipboard without HTTPS
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? 'Copied!' : `Click to copy ${value}`}
      className={`inline-flex items-center gap-1 text-[10px] font-mono text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 transition-colors ${className}`}
    >
      <span className="opacity-60">{label}</span>
      <span>{display}</span>
      {copied ? (
        <span className="text-green-600 dark:text-green-400">✓</span>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 opacity-60">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      )}
    </button>
  )
}
