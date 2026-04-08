import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AppNav from '@/app/components/AppNav'
import ResearchClient from './research-client'

export default async function ResearchPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: posts } = await supabase
    .from('research_posts')
    .select('id, title, type, content, tags, created_at')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Research Board</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Share findings, ask questions, and collaborate on agricultural research.
            </p>
          </div>
          <Link
            href="/research/new"
            className="bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
          >
            Post research
          </Link>
        </div>
        <ResearchClient posts={posts ?? []} />
      </main>
    </div>
  )
}
