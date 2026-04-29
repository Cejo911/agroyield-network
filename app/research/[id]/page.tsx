import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import AppNav from '@/app/components/AppNav'
import BackButton from '@/app/components/BackButton'
import ResearchActions from './ResearchActions'
import CommentsSection from '@/app/components/CommentsSection'
import LikeButton from '@/app/components/LikeButton'
import ReportButton from '@/app/components/ReportButton'

const TYPE_COLOURS: Record<string, string> = {
  finding:       'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  question:      'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  dataset:       'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  review:        'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  collaboration: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400',
  guide:         'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400',
  resource:      'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400',
}

const getTypeColour = (type: string | null): string => {
  if (!type) return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
  return TYPE_COLOURS[type.toLowerCase()] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
}

export default async function ResearchPostPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: post } = await supabase
    .from('research_posts')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (!post) notFound()

  const isOwner     = !!user && user.id === post.user_id
  const isLocked    = post.is_locked ?? false
  const canReadFull = !isLocked || !!user
  const tags: string[] = Array.isArray(post.tags) ? post.tags : []
  const preview = post.content.slice(0, 220).trimEnd()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <BackButton fallbackHref="/research" label="Back to Research" />

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-8">
          <div className="flex flex-wrap gap-2 mb-4">
            {post.type && (
              <span className={`text-xs px-3 py-1 rounded-full font-medium capitalize ${getTypeColour(post.type)}`}>
                {post.type}
              </span>
            )}
            {isLocked && (
              <span className="text-xs px-3 py-1 rounded-full font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                🔒 Members only
              </span>
            )}
            {tags.map((tag: string) => (
              <span key={tag} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-3 py-1 rounded-full">
                {tag}
              </span>
            ))}
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{post.title}</h1>
          <p className="text-xs text-gray-500 dark:text-gray-500 mb-6">
            {new Date(post.created_at).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>

          {/* Cover Image */}
          {post.cover_image_url && (
            <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-6">
              <Image src={post.cover_image_url} alt={post.title} fill className="object-contain" sizes="(max-width: 768px) 100vw, 672px" />
            </div>
          )}

          {canReadFull ? (
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">{post.content}</p>
            </div>
          ) : (
            <div>
              <div className="relative">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap text-sm">{preview}{post.content.length > 220 ? '…' : ''}</p>
                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white dark:from-gray-900 to-transparent" />
              </div>
              <div className="mt-6 flex flex-col items-center gap-3 py-6 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-center">
                <span className="text-3xl">🔒</span>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">This post is for members only</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Sign in to read the full content and join the discussion.</p>
                <Link href="/login" className="mt-1 bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors">Sign in to read full post</Link>
              </div>
            </div>
          )}

          {/* File Attachment */}
          {canReadFull && post.attachment_url && (
            <div className="mt-6 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center gap-3">
              <span className="text-xl">
                {post.attachment_name?.endsWith('.pdf') ? '📕' :
                 post.attachment_name?.match(/\.docx?$/) ? '📘' :
                 post.attachment_name?.match(/\.xlsx?$|\.csv$/) ? '📗' : '📎'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                  {post.attachment_name || 'Attached file'}
                </p>
              </div>
              <a
                href={post.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
              >
                Download
              </a>
            </div>
          )}

          {isOwner && <ResearchActions id={id} />}

          {canReadFull && (
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex gap-3">
              <LikeButton postId={id} postType="research" />
              <ReportButton postId={id} postType="research" />
            </div>
          )}

          {canReadFull && <CommentsSection postId={id} postType="research" />}
        </div>
      </main>
    </div>
  )
}
