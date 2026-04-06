import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'

const TYPE_COLOURS: Record<string, string> = {
  finding: 'bg-blue-100 text-blue-700',
  question: 'bg-purple-100 text-purple-700',
  dataset: 'bg-green-100 text-green-700',
  review: 'bg-orange-100 text-orange-700',
  collaboration: 'bg-pink-100 text-pink-700',
}

const getTypeColour = (type: string | null): string => {
  if (!type) return 'bg-gray-100 text-gray-600'
  return TYPE_COLOURS[type] ?? 'bg-gray-100 text-gray-600'
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌾</span>
            <span className="font-bold text-green-700 text-lg">AgroYield Network</span>
          </div>
          <Link href="/research" className="text-sm text-gray-600 hover:text-green-700 font-medium">
            Back to Research Board
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">

          <div className="flex flex-wrap gap-2 mb-4">
            {post.type && (
              <span className={`text-xs px-3 py-1 rounded-full font-medium capitalize ${getTypeColour(post.type)}`}>
                {post.type}
              </span>
            )}
            {tags.map((tag: string) => (
              <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full">
                {tag}
              </span>
            ))}
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">{post.title}</h1>

          <p className="text-xs text-gray-400 mb-6">
            {new Date(post.created_at).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>

          <div className="prose prose-sm max-w-none">
            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{post.content}</p>
          </div>

        </div>
      </main>
    </div>
  )
}
