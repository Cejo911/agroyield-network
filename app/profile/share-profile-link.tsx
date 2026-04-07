'use client'
import { useState } from 'react'

export default function ShareProfileLink({ username }: { username: string }) {
  const [copied, setCopied] = useState(false)
  const url = `https://agroyield.africa/u/${username}`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mb-8 bg-green-50 border border-green-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-semibold text-green-800">Your public profile URL</span>
      </div>
      <p className="text-xs text-green-600 mb-3">
        Share this link on your CV, email signature or social media.
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-sm bg-white border border-green-200 rounded-lg px-3 py-2 text-green-700 truncate">
          {url}
        </code>
        <button
          onClick={handleCopy}
          className="shrink-0 text-sm font-semibold px-4 py-2 rounded-lg border transition-colors bg-green-600 text-white hover:bg-green-700 border-green-600"
        >
          {copied ? '✓ Copied!' : 'Copy'}
        </button>
        
          href={`/u/${username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-sm font-semibold px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:border-green-400 transition-colors"
        >
          View
        </a>
      </div>
    </div>
  )
}
