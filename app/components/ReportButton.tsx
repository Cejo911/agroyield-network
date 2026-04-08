'use client'

import { useState, useEffect, useRef } from 'react'

const REASONS = ['Spam', 'Misleading', 'Inappropriate', 'Duplicate', 'Other']

type Props = {
  postId:   string
  postType: 'opportunity' | 'listing'
}

export default function ReportButton({ postId, postType }: Props) {
  const [reported, setReported] = useState(false)
  const [open,     setOpen]     = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [success,  setSuccess]  = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const init = async () => {
      try {
        const res  = await fetch(`/api/report?postId=${postId}&postType=${postType}`)
        const data = await res.json() as { reported: boolean }
        setReported(data.reported)
      } catch { /* keep default */ }
    }
    init()
  }, [postId, postType])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setError(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const submit = async (reason: string) => {
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, postType, reason }),
      })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Failed to report')
      } else {
        setReported(true)
        setSuccess(true)
        setTimeout(() => { setOpen(false); setSuccess(false) }, 1500)
      }
    } finally {
      setLoading(false)
    }
  }

  if (reported && !open) {
    return (
      <span className="flex items-center gap-1 text-xs text-gray-300" title="You reported this post">
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" d="M3 2.25a.75.75 0 01.75.75v.54l1.838-.46a9.75 9.75 0 016.317.175l.41.131a8.25 8.25 0 005.37.148l2.929-.863A.75.75 0 0121 3v13.5a.75.75 0 01-.513.707l-3.337.985a9.75 9.75 0 01-6.338-.175l-.41-.131a8.25 8.25 0 00-5.37-.148L3 18.88V21a.75.75 0 01-1.5 0V3A.75.75 0 013 2.25z" clipRule="evenodd" />
        </svg>
        Reported
      </span>
    )
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(!open); setError(null) }}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-orange-500 transition-colors"
        aria-label="Report post">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
        </svg>
        Report
      </button>

      {open && (
        <div className="absolute right-0 bottom-full mb-2 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {success ? (
            <div className="px-4 py-3 text-sm text-green-600 font-medium text-center">✓ Reported</div>
          ) : (
            <>
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Report reason</p>
              </div>
              {error && <p className="px-3 py-1.5 text-xs text-red-600">{error}</p>}
              {REASONS.map(reason => (
                <button key={reason} onClick={() => submit(reason)} disabled={loading}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors disabled:opacity-50">
                  {reason}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
