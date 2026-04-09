import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import AppNav from '@/app/components/AppNav'
import ResearchActions from './ResearchActions'
import CommentsSection from '@/app/components/CommentsSection'

const TYPE_COLOURS: Record<string, string> = {
  finding:       'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  question:      'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  dataset:       'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  review:        'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  collaboration: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400',
}

const getTypeColour = (type: string | null): string => {
  if (!type) return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
  return TYPE_COLOURS[type] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
}

export default async function ResearchPostPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: post } = await supabase
    .from('research_posts')
    .select('*')
    .eq('id', id)
    .single()

  if (!post) notFound()

  const isOwner = user.id === post.user_id
  const tags: string[] = Array.isArray(post.tags) ? post.tags : []

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <a href="/research" className="text-sm text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 mb-6 inline-block">{'← Back to Research'}</a>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-8">
          <div className="flex flex-wrap gap-2 mb-4">
            {post.type && (
              <span className={`text-xs px-3 py-1 rounded-full font-medium capitalize ${getTypeColour(post.type)}`}>
                {post.type}
              </span>
            )}
            {tags.map((tag: string) => (
              <span key={tag} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-3 py-1 rounded-full">
                {tag}
              </span>
            ))}
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{post.title}</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
            {new Date(post.created_at).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>

          <div className="prose prose-sm max-w-none">
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">{post.content}</p>
          </div>

          {isOwner && <ResearchActions id={id} />}
          <CommentsSection postId={id} postType="research" />
        </div>
      </main>
    </div>
  )
}
