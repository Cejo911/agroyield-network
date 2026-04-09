'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function OpportunityActions({ id, isClosed }: { id: string; isClosed: boolean }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [deleting,   setDeleting]   = useState(false)
  const [toggling,   setToggling]   = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('opportunities').update({ is_active: false }).eq('id', id)
    router.push('/opportunities')
  }

  const handleToggleClosed = async () => {
    setToggling(true)
    const supabase = createClient()
    await supabase.from('opportunities').update({ is_closed: !isClosed }).eq('id', id)
    router.refresh()
    setToggling(false)
  }

  return (
    <div className="flex flex-col gap-3 mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
      <div className="flex gap-3">
        <a href={`/opportunities/${id}/edit`} className="flex-1 text-center py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">✏️ Edit</a>
        <button
          onClick={handleToggleClosed}
          disabled={toggling}
          className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors disabled:opacity-50 ${
            isClosed
              ? 'border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
              : 'border-yellow-300 dark:border-yellow-700 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
          }`}
        >
          {toggling ? '…' : isClosed ? '🔓 Re-open' : '🔒 Mark as Closed'}
        </button>
      </div>

      {!confirming ? (
        <button onClick={() => setConfirming(true)} className="w-full py-2.5 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
          🗑️ Delete
        </button>
      ) : (
        <div className="flex gap-2">
          <button onClick={() => setConfirming(false)} className="flex-1 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
          <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors">
            {deleting ? 'Deleting…' : 'Confirm'}
          </button>
        </div>
      )}
    </div>
  )
}
