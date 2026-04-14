'use client'
import { useState } from 'react'

export default function NotifyPanel() {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [targetUserId, setTargetUserId] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)

  const sInput = 'border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500'

  const send = async () => {
    if (!title.trim() || !message.trim()) return
    setSending(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          ...(targetUserId.trim() ? { targetUserId: targetUserId.trim() } : {}),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult({ ok: true, text: `Notification sent to ${data.count ?? 'all'} user(s).` })
        setTitle('')
        setMessage('')
        setTargetUserId('')
      } else {
        setResult({ ok: false, text: data.error || 'Failed to send notification.' })
      }
    } catch {
      setResult({ ok: false, text: 'Network error. Please try again.' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <div className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-lg p-4 space-y-4">
        <div>
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Send Platform Notification</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Broadcast to all users or target a specific user by their ID.
          </p>
        </div>

        <div>
          <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Title *</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Platform Update" className={`w-full ${sInput}`} />
        </div>

        <div>
          <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Message *</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)}
            placeholder="Write the notification message..." rows={3}
            className={`w-full resize-none ${sInput}`} />
        </div>

        <div>
          <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Target User ID (optional — leave blank for broadcast)</label>
          <input type="text" value={targetUserId} onChange={e => setTargetUserId(e.target.value)}
            placeholder="e.g. 3fa85f64-5717-4562-b3fc-2c963f66afa6" className={`w-full ${sInput}`} />
        </div>

        <div className="flex items-center gap-3">
          <button onClick={send} disabled={sending || !title.trim() || !message.trim()}
            className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
            {sending ? 'Sending...' : targetUserId.trim() ? 'Send to User' : 'Broadcast to All'}
          </button>
          {result && (
            <span className={`text-sm font-medium ${result.ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {result.text}
            </span>
          )}
        </div>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-4 py-3">
        <p className="text-xs text-yellow-700 dark:text-yellow-400">
          <strong>Broadcast warning:</strong> Leaving the User ID empty will send this notification to every non-suspended user on the platform. Use with care.
        </p>
      </div>
    </div>
  )
}
