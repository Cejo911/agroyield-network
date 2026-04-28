'use client'
import { useState } from 'react'
import Link from 'next/link'

interface Ticket {
  id: string
  subject: string
  description: string
  category: string
  priority: string
  status: string
  assigned_to: string | null
  assignedName?: string
  sla_deadline: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
}

const CATEGORIES = ['General', 'Account', 'Billing', 'Technical', 'Content', 'Other']
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent']

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  in_progress: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  resolved: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  closed: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400',
}

const PRIORITY_COLORS: Record<string, string> = {
  Low: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400',
  Medium: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  High: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  Urgent: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
}

function maskEmail(email: string): string {
  const [name, domain] = email.split('@')
  if (!name || !domain) return email
  return `${name[0]}***@${domain}`
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  const intervals: Record<string, number> = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  }

  for (const [key, value] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / value)
    if (interval >= 1) {
      return `${interval} ${key}${interval > 1 ? 's' : ''} ago`
    }
  }
  return 'just now'
}

function isSLABreached(deadline: string | null): boolean {
  if (!deadline) return false
  return new Date(deadline) < new Date()
}

export default function SupportClient({ userEmail }: { userEmail: string }) {
  const [verified, setVerified] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [otpError, setOtpError] = useState<string | null>(null)
  const [otpSent, setOtpSent] = useState(false)

  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [form, setForm] = useState({
    subject: '',
    description: '',
    category: 'General',
    priority: 'Medium',
  })

  async function handleSendCode() {
    setSendingCode(true)
    setOtpError(null)
    try {
      const res = await fetch('/api/support/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send code')
      }
      setOtpSent(true)
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : 'Failed to send verification code')
    } finally {
      setSendingCode(false)
    }
  }

  async function handleVerifyCode() {
    if (otpCode.length !== 6) {
      setOtpError('Please enter a 6-digit code')
      return
    }
    setVerifying(true)
    setOtpError(null)
    try {
      const res = await fetch('/api/support/verify', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, token: otpCode }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Invalid code')
      }
      setVerified(true)
      fetchTickets()
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setVerifying(false)
    }
  }

  async function fetchTickets() {
    setLoading(true)
    try {
      const res = await fetch('/api/support/tickets')
      if (res.ok) {
        const data = await res.json()
        setTickets(data.tickets || [])
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmitTicket(e: React.FormEvent) {
    e.preventDefault()
    if (!form.subject.trim() || !form.description.trim()) {
      setFormError('Subject and description are required')
      return
    }

    setSubmitting(true)
    setFormError(null)
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          category: form.category.toLowerCase(),
          priority: form.priority.toLowerCase(),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create ticket')
      }
      const data = await res.json()
      setTickets([data.ticket, ...tickets])
      setForm({ subject: '', description: '', category: 'General', priority: 'Medium' })
      setShowForm(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create ticket')
    } finally {
      setSubmitting(false)
    }
  }

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  if (!verified) {
    return (
      <div className="py-12">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Support Centre</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            For your security, we need to verify your identity before accessing support.
          </p>

          <div className="mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Verification email</p>
            <p className="text-gray-900 dark:text-white font-medium">{maskEmail(userEmail)}</p>
          </div>

          {!otpSent ? (
            <button
              onClick={handleSendCode}
              disabled={sendingCode}
              className="w-full bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition"
            >
              {sendingCode ? 'Sending...' : 'Send Verification Code'}
            </button>
          ) : (
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Verification Code (6 digits)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '')
                    setOtpCode(v.slice(0, 6))
                  }}
                  placeholder="000000"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              {otpError && (
                <p className="text-red-600 dark:text-red-400 text-sm mb-4">{otpError}</p>
              )}
              <button
                onClick={handleVerifyCode}
                disabled={verifying || otpCode.length !== 6}
                className="w-full bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition"
              >
                {verifying ? 'Verifying...' : 'Verify'}
              </button>
              <button
                onClick={() => {
                  setOtpSent(false)
                  setOtpCode('')
                  setOtpError(null)
                }}
                className="w-full mt-2 text-green-600 dark:text-green-400 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Use different email
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Support Centre</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage your support tickets and get help from our team.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-green-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-green-700 transition"
        >
          {showForm ? 'Cancel' : 'New Ticket'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Create New Ticket</h2>
          <form onSubmit={handleSubmitTicket} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subject *
              </label>
              <input
                type="text"
                name="subject"
                value={form.subject}
                onChange={handleFormChange}
                placeholder="Brief description of your issue"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Priority
                </label>
                <select
                  name="priority"
                  value={form.priority}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {PRIORITIES.map(pri => (
                    <option key={pri} value={pri}>{pri}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description *
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleFormChange}
                placeholder="Please provide as much detail as possible"
                rows={5}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
            </div>

            {formError && (
              <p className="text-red-600 dark:text-red-400 text-sm">{formError}</p>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition"
              >
                {submitting ? 'Creating...' : 'Create Ticket'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">Loading tickets...</p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">No tickets yet</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-green-600 dark:text-green-400 font-medium hover:underline"
          >
            Create your first ticket
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map(ticket => (
            <Link
              key={ticket.id}
              href={`/support/${ticket.id}`}
              className="block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 hover:border-gray-300 dark:hover:border-gray-700 transition"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900 dark:text-white">{ticket.subject}</h3>
                <div className="flex gap-2">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[ticket.status]}`}>
                    {ticket.status.replace('_', ' ')}
                  </span>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${PRIORITY_COLORS[ticket.priority]}`}>
                    {ticket.priority}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{ticket.description.slice(0, 100)}...</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                  <span>{ticket.category}</span>
                  <span>•</span>
                  <span>{timeAgo(ticket.created_at)}</span>
                </div>
                {isSLABreached(ticket.sla_deadline) && (
                  <p className="text-xs font-medium text-red-600 dark:text-red-400">SLA breached</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
