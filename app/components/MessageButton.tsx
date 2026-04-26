'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/app/components/Toast'

interface Props {
  recipientId: string
  className?: string
  label?: string
}

export default function MessageButton({ recipientId, className, label = 'Message' }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { showError } = useToast()

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId }),
      })
      const data = await res.json()
      if (data.conversationId) {
        router.push(`/messages/${data.conversationId}`)
      } else {
        showError(data.error || 'Could not start conversation')
        setLoading(false)
      }
    } catch {
      showError('Network error — please check your connection and retry.')
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={className || 'text-xs font-semibold px-3 py-1.5 rounded-full border border-green-600 text-green-600 hover:bg-green-600 hover:text-white transition-colors disabled:opacity-50'}
    >
      {loading ? '…' : `✉️ ${label}`}
    </button>
  )
}
