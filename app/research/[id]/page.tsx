import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import AppNav from '@/app/components/AppNav'

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

  const tags: string[] = Array.isArray(post.tags) ? post.tags : []

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-8">
          <div className="flex flex-wrap gap-2 mb-4">
            {post.type && (
              <span className={`text-xs px-3 py-1 rounded-full font-medium capitalize ${getTypeColour(post.type)}`}>
                {post.type}
              </span>
            )}
            {tags.map((tag: string)
