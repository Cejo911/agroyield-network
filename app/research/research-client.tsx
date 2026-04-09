'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const TYPES = ['All', 'Finding', 'Question', 'Dataset', 'Review', 'Collaboration']
const TYPE_COLOURS: Record<string, string> = {
  finding:       'bg-blue-100   dark:bg-blue-900/30   text-blue-700   dark:text-blue-400',
  question:      'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  dataset:       'bg-green-100  dark:bg-green-900/30  text-green-700  dark:text-green-400',
  review:        'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  collaboration: 'bg-pink-100   dark:bg-pink-900/30   text-pink-700   dark:text-pink-400',
}
const TAGS = [
  'Crop Science', 'Livestock', 'Agritech', 'Soil Health', 'Irrigation',
  'Food Processing', 'Agricultural Finance', 'Climate & Sustainability',
  'Supply Chain', 'Research & Development',
]

export type ResearchPost = {
  id: string
  user_id: string
  title: string
  type: string | null
  content: string
  tags: string[] | null
  created_at: string
}

const getTypeColour = (type: string | null) =>
  type ? (TYPE_COLOURS[type] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400') : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'

const timeAgo = (dateStr: string) => {
  const diff  = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (hours < 1)  return 'Just now'
  if (hours < 24) return `${hours}h ago`
  if (days < 7)   return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ResearchClient({
  posts: initial,
  userId,
}: {
  posts: ResearchPost[]
  userId: string
}) {
  const [posts, setPosts]           = useState(initial)
  const [search, setSearch]         = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [tagFilter, setTagFilter]   = useState('')
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [deletingId, setDeletingId]     = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    const supabase = createClient()
    await supabase.from('research_posts').update({ is_active: false }).eq('id', id)
    setPosts(prev => prev.filter(p => p.id !== id))
    setDeletingId(null)
    setConfirmingId(null)
  }

  const filtered = posts.filter(p => {
    const matchesSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.content.toLowerCase().includes(search.toLowerCase())
    const matchesType   = typeFilter === 'All' || (p.type ?? '').toLowerCase() === typeFilter.toLowerCase()
    const matchesTag    = !tagFilter || (p.tags ?? []).includes(tagFilter)
    return matchesSearch && matchesType && matchesTag
  })

  const filterBtn = (active: boolean) =>
    `px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${active ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-green-400 dark:hover:border-green-500'}`

  return (
    <div>
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 mb-8 space-y-4">
        <input
          type="text"
          placeholder="Search by title or content..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <div className="flex flex-wrap gap-2">
          {TYPES.map(type => (
            <button key={type} onClick={() => setTypeFilter(type)} className={filterBtn(typeFilter === type)}>{type}</button>
          ))}
        </div>
        <div className="pt-1 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Filter by topic</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setTagFilter('')} className={filterBtn(tagFilter === '')}>All topics</button>
            {TAGS.map(tag => (
              <button key={tag} onClick={() => setTagFilter(prev => prev === tag ? '' : tag)} className={filterBtn(tagFilter === tag)}>{tag}</button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
        {filtered.length} {filtered.length === 1 ? 'post' : 'posts'} found
      </p>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-4xl mb-3">🔬</p>
          <p className="font-medium">No research posts match your filters</p>
          <p className="text-sm mt-1">Try adjusting your search or topic</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(post => {
            const isOwner = post.user_id === userId
            return (
              <div key={post.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-green-200 dark:hover:border-green-800 transition-all">
                <Link href={`/research/${post.id}`} className="block p-6 group">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {post.type && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${getTypeColour(post.type)}`}>{post.type}</span>
                    )}
                    {(post.tags ?? []).slice(0, 2).map(tag => (
                      <span key={tag} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors text-lg mb-2">{post.title}</h3>
                  <p className="text-sm text-gray-400 dark:text-gray-500 line-clamp-2">{post.content}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">{timeAgo(post.created_at)}</p>
                </Link>

                {isOwner && (
                  <div className="px-6 pb-4 flex items-center justify-end gap-2 border-t border-gray-100 dark:border-gray-800 pt-3">
                    {confirmingId === post.id ? (
                      <>
                        <button
                          onClick={() => setConfirmingId(null)}
                          className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-2 py-1 rounded transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDelete(post.id)}
                          disabled={deletingId === post.id}
                          className="text-xs bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          {deletingId === post.id ? 'Deleting…' : 'Confirm delete'}
                        </button>
                      </>
                    ) : (
                      <>
                        <Link href={`/research/${post.id}/edit`} className="text-xs text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 px-2 py-1 rounded transition-colors">✏️ Edit</Link>
                        <button
                          onClick={() => setConfirmingId(post.id)}
                          className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 px-2 py-1 rounded transition-colors"
                        >
                          🗑️ Delete
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
