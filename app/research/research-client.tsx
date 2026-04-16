'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useSearchLog } from '@/lib/useSearchLog'
import LikeButton from '@/app/components/LikeButton'
import ReportButton from '@/app/components/ReportButton'

const TYPES = ['All', 'Finding', 'Question', 'Dataset', 'Review', 'Collaboration', 'Guide', 'Resource']
const TYPE_COLOURS: Record<string, string> = {
  finding:       'bg-blue-100   dark:bg-blue-900/30   text-blue-700   dark:text-blue-400',
  question:      'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  dataset:       'bg-green-100  dark:bg-green-900/30  text-green-700  dark:text-green-400',
  review:        'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  collaboration: 'bg-pink-100   dark:bg-pink-900/30   text-pink-700   dark:text-pink-400',
  guide:         'bg-teal-100   dark:bg-teal-900/30   text-teal-700   dark:text-teal-400',
  resource:      'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400',
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
  cover_image_url: string | null
  is_locked: boolean
  created_at: string
}

const getTypeColour = (type: string | null) =>
  type ? (TYPE_COLOURS[type.toLowerCase()] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400') : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'

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
  profileMap,
  userId,
}: {
  posts: ResearchPost[]
  profileMap: Record<string, { first_name: string | null; last_name: string | null; avatar_url: string | null; username: string | null }>
  userId: string
}) {
  const [posts, setPosts]               = useState(initial)
  const [search, setSearch]             = useState('')
  const [sortBy, setSortBy]             = useState<'newest' | 'oldest'>('newest')
  const [typeFilter, setTypeFilter]     = useState('All')
  const [tagFilter, setTagFilter]       = useState('')
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

  // Sort filtered results
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime() // newest
  })

  useSearchLog(search, 'research', sorted.length)

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
        <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">{sorted.length} {sorted.length === 1 ? 'post' : 'posts'} found</p>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-4xl mb-3">🔬</p>
          <p className="font-medium">No research posts match your filters</p>
          <p className="text-sm mt-1">Try adjusting your search or topic</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map(post => {
            const isOwner = post.user_id === userId
            return (
              <div key={post.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-green-200 dark:hover:border-green-800 transition-all">
                <Link href={`/research/${post.id}`} className="block group">
                  {post.cover_image_url && (
                    <div className="relative w-full aspect-[16/9] bg-gray-100 dark:bg-gray-800 rounded-t-2xl overflow-hidden">
                      <Image src={post.cover_image_url} alt={post.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 672px" />
                    </div>
                  )}
                  <div className="p-6">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {post.type && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${getTypeColour(post.type)}`}>{post.type}</span>
                    )}
                    {post.is_locked && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">🔒 Members only</span>
                    )}
                    {(post.tags ?? []).slice(0, 2).map(tag => (
                      <span key={tag} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors text-lg mb-2">{post.title}</h3>
                  <p className="text-sm text-gray-400 dark:text-gray-500 line-clamp-2">{post.content}</p>
                  <div className="flex items-center gap-2 mt-3">
                    {(() => {
                      const profile = profileMap[post.user_id]
                      if (!profile) return <span className="text-xs text-gray-400 dark:text-gray-500">Anonymous</span>
                      const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Anonymous'
                      const href = profile.username ? `/u/${profile.username}` : `/directory/${post.user_id}`
                      return (
                        <Link href={href} className="flex items-center gap-1.5 group" onClick={e => e.stopPropagation()}>
                          {profile.avatar_url ? (
                            <Image src={profile.avatar_url} alt="" width={20} height={20} className="rounded-full object-cover shrink-0" />
                          ) : (
                            <span className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                              {(profile.first_name?.[0] || '?').toUpperCase()}
                            </span>
                          )}
                          <span className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                            {name}
                          </span>
                        </Link>
                      )
                    })()}
                    <span className="text-gray-300 dark:text-gray-700">·</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{timeAgo(post.created_at)}</span>
                  </div>
                  </div>
                </Link>

                <div className="px-6 pb-4 flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-3">
                  <LikeButton postId={post.id} postType="research" />

                  {isOwner ? (
                    <div className="flex items-center gap-2">
                      {confirmingId === post.id ? (
                        <>
                          <button onClick={() => setConfirmingId(null)} className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-2 py-1 rounded transition-colors">Cancel</button>
                          <button onClick={() => handleDelete(post.id)} disabled={deletingId === post.id} className="text-xs bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
                            {deletingId === post.id ? 'Deleting…' : 'Confirm delete'}
                          </button>
                        </>
                      ) : (
                        <>
                          <Link href={`/research/${post.id}/edit`} className="text-xs text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 px-2 py-1 rounded transition-colors">✏️ Edit</Link>
                          <button onClick={() => setConfirmingId(post.id)} className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 px-2 py-1 rounded transition-colors">🗑️ Delete</button>
                        </>
                      )}
                    </div>
                  ) : (
                    <ReportButton postId={post.id} postType="research" />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
