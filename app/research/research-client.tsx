'use client'

import { useState } from 'react'
import Link from 'next/link'

const TYPES = ['All', 'Finding', 'Question', 'Dataset', 'Review', 'Collaboration']

const TYPE_COLOURS: Record<string, string> = {
  finding: 'bg-blue-100 text-blue-700',
  question: 'bg-purple-100 text-purple-700',
  dataset: 'bg-green-100 text-green-700',
  review: 'bg-orange-100 text-orange-700',
  collaboration: 'bg-pink-100 text-pink-700',
}

const TAGS = [
  'Crop Science', 'Livestock', 'Agritech', 'Soil Health', 'Irrigation',
  'Food Processing', 'Agricultural Finance', 'Climate & Sustainability',
  'Supply Chain', 'Research & Development',
]

type ResearchPost = {
  id: string
  title: string
  type: string | null
  content: string
  tags: string[] | null
  created_at: string
}

const getTypeColour = (type: string | null): string => {
  if (!type) return 'bg-gray-100 text-gray-600'
  return TYPE_COLOURS[type] ?? 'bg-gray-100 text-gray-600'
}

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ResearchClient({ posts }: { posts: ResearchPost[] }) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [tagFilter, setTagFilter] = useState('')

  const filtered = posts.filter(p => {
    const matchesSearch =
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.content.toLowerCase().includes(search.toLowerCase())

    const matchesType =
      typeFilter === 'All' ||
      (p.type ?? '').toLowerCase() === typeFilter.toLowerCase()

    const matchesTag =
      !tagFilter ||
      (p.tags ?? []).includes(tagFilter)

    return matchesSearch && matchesType && matchesTag
  })

  return (
    <div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-8 space-y-4">
        <input
          type="text"
          placeholder="Search by title or content..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <div className="flex flex-wrap gap-2">
          {TYPES.map(type => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                typeFilter === type
                  ? 'bg-green-600 text-white border-green-600'
                  : 'border-gray-300 text-gray-600 hover:border-green-400'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
        <select
          value={tagFilter}
          onChange={e => setTagFilter(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">All topics</option>
          {TAGS.map(tag => (
            <option key={tag} value={tag}>{tag}</option>
          ))}
        </select>
      </div>

      <p className="text-sm text-gray-500 mb-5">
        {filtered.length} {filtered.length === 1 ? 'post' : 'posts'} found
      </p>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🔬</p>
          <p className="font-medium">No research posts yet</p>
          <p className="text-sm mt-1">Be the first to share your findings</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(post => (
            <Link
              key={post.id}
              href={`/research/${post.id}`}
              className="block bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md hover:border-green-200 transition-all group"
            >
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {post.type && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${getTypeColour(post.type)}`}>
                    {post.type}
                  </span>
                )}
                {(post.tags ?? []).slice(0, 2).map(tag => (
                  <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
              <h3 className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors text-lg mb-2">
                {post.title}
              </h3>
              <p className="text-sm text-gray-400 line-clamp-2">{post.content}</p>
              <p className="text-xs text-gray-400 mt-3">{timeAgo(post.created_at)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
