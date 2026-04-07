'use client'

import { useState } from 'react'

interface Props {
  username: string
}

export default function ShareProfileLink({ username }: Props) {
  const [copied, setCopied] = useState(false)
  const url = `https://agroyield.africa/u/${username}`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4">
      <p className="text-sm font-semibold text-gray-700 mb-2">Your public profile link</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-600 truncate">
          {url}
        </code>
        <button
          onClick={handleCopy}
          className="shrink-0 text-sm font-semibold px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
        
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-sm font-semibold px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          View
        </a>
      </div>
    </div>
  )
}
