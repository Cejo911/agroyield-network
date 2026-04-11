'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function StatementControls({
  customerId, from, to,
}: {
  customerId: string
  from: string
  to: string
}) {
  const router = useRouter()
  const [fromDate, setFromDate] = useState(from)
  const [toDate, setToDate] = useState(to)
  const [copied, setCopied] = useState(false)

  function applyFilter() {
    router.push(`/business/customers/${customerId}/statement?from=${fromDate}&to=${toDate}`)
  }

  function copyShareLink() {
    const printUrl = `${window.location.origin}/business/customers/${customerId}/statement/print?from=${fromDate}&to=${toDate}`
    navigator.clipboard.writeText(printUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600 font-medium">From</label>
        <input
          type="date"
          value={fromDate}
          onChange={e => setFromDate(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600 font-medium">To</label>
        <input
          type="date"
          value={toDate}
          onChange={e => setToDate(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>
      <button
        onClick={applyFilter}
        className="bg-green-700 text-white text-sm font-semibold px-4 py-1.5 rounded-lg hover:bg-green-800"
      >
        Apply
      </button>
      <button
        onClick={copyShareLink}
        className="border border-gray-300 text-gray-700 text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
      >
        {copied ? '✓ Link Copied!' : '🔗 Copy Share Link'}
      </button>
    </div>
  )
}
