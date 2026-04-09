'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function OpportunityActions({ id }: { id: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('opportunities').update({ is_active: false }).eq('id', id)
    router.push('/opportunities')
  }

  return (
    <div className="flex gap-3 mt-6">
      <a href={`/opportunities/${id}/edit`} className="flex-1 text-center py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">✏️ Edit</a>
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="flex-1 py-2.5 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          🗑️ Delete
        </button>
      ) : (
        <div className="flex-1 flex gap-2">
          <button
            onClick={() => setConfirming(false)}
            className="flex-1 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {deleting ? 'Deleting…' : 'Confirm'}
          </button>
        </div>
      )}
    </div>
  )
}
