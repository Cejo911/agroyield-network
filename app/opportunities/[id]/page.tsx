import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import AppNav from '@/app/components/AppNav'
import LikeButton from '@/app/components/LikeButton'
import ReportButton from '@/app/components/ReportButton'
import BookmarkButton from '@/app/components/design/BookmarkButton'
import OpportunityActions from './OpportunityActions'
import CommentsSection from '@/app/components/CommentsSection'

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: opportunity } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (!opportunity) notFound()

  // Bookmark state for logged-in users (anonymous visitors see the outline button
  // but cannot interact — the API route enforces auth anyway).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any
  let isSaved = false
  if (user) {
    const { data: savedRow } = await supabaseAny
      .from('saves')
      .select('content_id')
      .eq('user_id', user.id)
      .eq('content_type', 'opportunity')
      .eq('content_id', id)
      .maybeSingle()
    isSaved = !!savedRow
  }

  const isOwner  = !!user && user.id === opportunity.user_id
  const isClosed = opportunity.is_closed ?? false

  const deadline = opportunity.deadline
    ? new Date(opportunity.deadline).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <a href="/opportunities" className="text-sm text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 mb-6 inline-block">{'← Back to Opportunities'}</a>

        <div className="relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
          {user && (
            <div className="absolute top-4 right-4 z-10">
              <BookmarkButton
                contentType="opportunity"
                contentId={id}
                initiallySaved={isSaved}
                size="md"
              />
            </div>
          )}
          {isClosed && (
            <div className="mb-5 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <span className="text-sm font-semibold text-red-600 dark:text-red-400">🔴 This opportunity is now closed</span>
            </div>
          )}

          <div className="flex items-start justify-between gap-4 mb-4 pr-12">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                  {opportunity.type}
                </span>
                {isClosed && (
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                    CLOSED
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{opportunity.title}</h1>
              {opportunity.organisation && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{opportunity.organisation}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6">
            {opportunity.location && <span>📍 {opportunity.location}</span>}
            {deadline && <span>⏰ Deadline: {deadline}</span>}
          </div>

          <div className="mb-4">
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line text-sm">{opportunity.description}</p>
          </div>

          {opportunity.requirements && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Requirements</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">{opportunity.requirements}</p>
            </div>
          )}

          {opportunity.url && !isClosed && (
            <div className="mt-6">
              <a href={opportunity.url} target="_blank" rel="noopener noreferrer" className="inline-block w-full text-center bg-green-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors">{'Apply / Learn More'}</a>
            </div>
          )}

          {isOwner && <OpportunityActions id={id} isClosed={isClosed} />}

          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex gap-3">
            <LikeButton postId={id} postType="opportunity" />
            <ReportButton postId={id} postType="opportunity" />
          </div>

          <CommentsSection postId={id} postType="opportunity" />
        </div>
      </main>
    </div>
  )
}
