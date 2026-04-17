'use client'

import { useState } from 'react'

type Props = {
  slug: string
  isPublic: boolean
  siteOrigin: string
}

/**
 * Public-page card — shown on the business dashboard.
 * Makes the /b/{slug} URL obvious, copyable, and shareable.
 */
export default function PublicPageCard({ slug, isPublic, siteOrigin }: Props) {
  const [copied, setCopied] = useState(false)
  const url = `${siteOrigin}/b/${slug}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch { /* no-op */ }
  }

  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 border border-green-200 dark:border-green-800 rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-green-800 dark:text-green-300 text-sm">Your Public Page</h3>
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
          isPublic ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                   : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
        }`}>
          {isPublic ? 'Live' : 'Private'}
        </span>
      </div>

      <code className="block text-sm bg-white dark:bg-gray-900 border border-green-200 dark:border-green-700 rounded px-3 py-2 text-green-700 dark:text-green-300 break-all">
        {url}
      </code>

      <div className="flex flex-wrap gap-2">
        <button onClick={copy} className="text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50">
          {copied ? '✓ Copied' : 'Copy link'}
        </button>
        <a href={`/b/${slug}`} target="_blank" rel="noreferrer" className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700">
          View page
        </a>
        <a href={`https://wa.me/?text=${encodeURIComponent(`Check out my business on AgroYield: ${url}`)}`}
          target="_blank"
          rel="noreferrer"
          className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300"
        >
          Share on WhatsApp
        </a>
      </div>

      {!isPublic && (
        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          Your page is hidden. Toggle it to Public in settings so customers can find you.
        </p>
      )}
    </div>
  )
}