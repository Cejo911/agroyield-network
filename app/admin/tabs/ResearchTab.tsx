'use client'
import { useState } from 'react'
import { SearchBar, FilterPills } from './AdminSearchBar'

interface ResearchPost {
  id: string
  user_id: string
  title: string
  type: string
  is_active: boolean
  is_locked: boolean
  created_at: string
}

export default function ResearchTab({
  posts: initialPosts,
  getDisplayName,
  fmt,
}: {
  posts: ResearchPost[]
  getDisplayName: (id: string) => string
  fmt: (d: string) => string
}) {
  const [posts, setPosts] = useState(initialPosts)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const action = async (id: string, postAction: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== id) return p
      if (postAction === 'hide' || postAction === 'delete') return { ...p, is_active: false }
      if (postAction === 'show') return { ...p, is_active: true }
      if (postAction === 'lock') return { ...p, is_locked: true }
      if (postAction === 'unlock') return { ...p, is_locked: false }
      return p
    }))
    await fetch('/api/admin/research', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: postAction }),
    })
  }

  const filtered = posts.filter(p => {
    const q = search.toLowerCase()
    const matchesSearch = !q || p.title.toLowerCase().includes(q) || p.type.toLowerCase().includes(q) || getDisplayName(p.user_id).toLowerCase().includes(q)
    const matchesFilter = filter === 'all'
      || (filter === 'active' && p.is_active)
      || (filter === 'locked' && p.is_locked)
      || (filter === 'hidden' && !p.is_active)
    return matchesSearch && matchesFilter
  })

  return (
    <div>
      <SearchBar value={search} onChange={setSearch} placeholder="Search research posts by title, type, or poster..." />
      <FilterPills value={filter} onChange={setFilter} options={[
        { id: 'all', label: `All (${posts.length})` },
        { id: 'active', label: `Active (${posts.filter(p => p.is_active).length})` },
        { id: 'locked', label: `Locked (${posts.filter(p => p.is_locked).length})` },
        { id: 'hidden', label: `Hidden (${posts.filter(p => !p.is_active).length})` },
      ]} />
      <div className="space-y-3">
        {filtered.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-sm">No research posts found.</p>}
        {filtered.map(p => (
          <div key={p.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{p.title}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 capitalize">{p.type}</span>
                {p.is_locked && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">Locked</span>}
                {!p.is_active && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">Hidden</span>}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">by {getDisplayName(p.user_id)} · {fmt(p.created_at)}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
              {p.is_locked ? (
                <button onClick={() => action(p.id, 'unlock')} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700">Unlock</button>
              ) : (
                <button onClick={() => action(p.id, 'lock')} className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-3 py-1.5 rounded-md hover:bg-orange-200">Lock</button>
              )}
              {p.is_active ? (
                <button onClick={() => action(p.id, 'hide')} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700">Hide</button>
              ) : (
                <button onClick={() => action(p.id, 'show')} className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-md hover:bg-green-200">Show</button>
              )}
              <button onClick={() => action(p.id, 'delete')} className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
