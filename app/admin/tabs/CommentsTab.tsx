'use client'
import { useState } from 'react'
import { SearchBar, FilterPills } from './AdminSearchBar'

interface Comment {
  id: string
  user_id: string
  post_id: string
  post_type: string
  content: string
  user_name: string | null
  is_hidden: boolean
  created_at: string
}

export default function CommentsTab({
  comments: initialComments,
  getDisplayName,
  fmt,
}: {
  comments: Comment[]
  getDisplayName: (id: string) => string
  fmt: (d: string) => string
}) {
  const [comments, setComments] = useState(initialComments)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const action = async (id: string, commentAction: string) => {
    setComments(prev => prev.map(c => {
      if (c.id !== id) return c
      if (commentAction === 'hide') return { ...c, is_hidden: true }
      if (commentAction === 'show') return { ...c, is_hidden: false }
      if (commentAction === 'delete') return { ...c, is_hidden: true, content: '[Removed by admin]' }
      return c
    }))
    await fetch('/api/admin/comments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: commentAction }),
    })
  }

  const filtered = comments.filter(c => {
    const q = search.toLowerCase()
    const name = c.user_name || getDisplayName(c.user_id)
    const matchesSearch = !q || c.content?.toLowerCase().includes(q) || name.toLowerCase().includes(q) || c.post_type?.toLowerCase().includes(q)
    const matchesFilter = filter === 'all'
      || (filter === 'visible' && !c.is_hidden)
      || (filter === 'hidden' && c.is_hidden)
    return matchesSearch && matchesFilter
  })

  return (
    <div>
      <SearchBar value={search} onChange={setSearch} placeholder="Search comments by content, commenter, or post type..." />
      <FilterPills value={filter} onChange={setFilter} options={[
        { id: 'all', label: `All (${comments.length})` },
        { id: 'visible', label: `Visible (${comments.filter(c => !c.is_hidden).length})` },
        { id: 'hidden', label: `Hidden (${comments.filter(c => c.is_hidden).length})` },
      ]} />
      <div className="space-y-3">
        {filtered.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-sm">No comments found.</p>}
        {filtered.map(c => (
          <div key={c.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 capitalize">{c.post_type}</span>
                {c.is_hidden && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">Hidden</span>}
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 line-clamp-2">{c.content}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                by {c.user_name || getDisplayName(c.user_id)} · {fmt(c.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
              {c.is_hidden ? (
                <button onClick={() => action(c.id, 'show')} className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-md hover:bg-green-200">Show</button>
              ) : (
                <button onClick={() => action(c.id, 'hide')} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700">Hide</button>
              )}
              <button onClick={() => action(c.id, 'delete')} className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
