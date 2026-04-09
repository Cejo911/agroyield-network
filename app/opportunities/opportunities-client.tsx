'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import LikeButton from '@/app/components/LikeButton'
import ReportButton from '@/app/components/ReportButton'

export type Opportunity = {
  id: string
  user_id: string
  title: string
  type: string
  organisation: string | null
  location: string | null
  description: string
  deadline: string | null
  created_at: string
}

export default function OpportunitiesClient({
  opportunities: initial,
  userId,
}: {
  opportunities: Opportunity[]
  userId: string
}) {
  const [opportunities, setOpportunities] = useState(initial)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    const supabase = createClient()
    await supabase.from('opportunities').update({ is_active: false }).eq('id', id)
    setOpportunities(prev => prev.filter(o => o.id !== id))
    setDeletingId(null)
    setConfirmingId(null)
  }

  if (opportunities.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400 dark:text-gray-500">
        <p className="text-lg font-medium mb-1">No opportunities yet</p>
        <p className="text-sm">Be the first to post one.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {opportunities.map(opportunity => {
        const isOwner = opportunity.user_id === userId
        const deadline = opportunity.deadline
          ? new Date(opportunity.deadline).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric',
            })
          : null

        return (
          <div
            key={opportunity.id}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5"
          >
            <Link href={`/opportunities/${opportunity.id}`} className="block group">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 mb-1.5">
                    {opportunity.type}
                  </span>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                    {opportunity.title}
                  </h2>
                  {opportunity.organisation && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{opportunity.organisation}</p>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                {opportunity.description}
              </p>
              <div className="flex flex-wrap gap-3 text-xs text-gray-400 dark:text-gray-500">
                {opportunity.location && <span>📍 {opportunity.location}</span>}
                {deadline && <span>⏰ {deadline}</span>}
              </div>
            </Link>

            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center gap-3">
              <LikeButton postId={opportunity.id} userId={userId} postType="opportunity" />
              <ReportButton postId={opportunity.id} userId={userId} postType="opportunity" />

              {isOwner && (
                <div className="ml-auto flex items-center gap-2">
                  {confirmingId === opportunity.id ? (
                    <>
                      <button
                        onClick={() => setConfirmingId(null)}
                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-2 py-1 rounded transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDelete(opportunity.id)}
                        disabled={deletingId === opportunity.id}
                        className="text-xs bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        {deletingId === opportunity.id ? 'Deleting…' : 'Confirm delete'}
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href={`/opportunities/${opportunity.id}/edit`}
                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 px-2 py-1 rounded transition-colors"
                      >
                        ✏️ Edit
                      </Link>
                      <button
                        onClick={() => setConfirmingId(opportunity.id)}
                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 px-2 py-1 rounded transition-colors"
                      >
                        🗑️ Delete
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
