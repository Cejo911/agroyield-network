'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import LikeButton from '@/app/components/LikeButton'
import ReportButton from '@/app/components/ReportButton'
import BookmarkButton from '@/app/components/design/BookmarkButton'
import UserAvatar from '@/app/components/design/UserAvatar'
import EmptyState from '@/app/components/design/EmptyState'
import { PrimaryLink } from '@/app/components/design/Button'
import { useSearchLog } from '@/lib/useSearchLog'
import { formatRelativeTime } from '@/lib/format-time'

const CATEGORIES = ['All', 'Produce', 'Inputs', 'Equipment', 'Livestock', 'Oil', 'Services', 'Other']
const TYPES      = ['All', 'Sell', 'Buy', 'Trade']
const STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT Abuja', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers',
  'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
]

const CATEGORY_COLOURS: Record<string, string> = {
  produce:   'bg-green-100  dark:bg-green-900/30  text-green-700  dark:text-green-400',
  inputs:    'bg-blue-100   dark:bg-blue-900/30   text-blue-700   dark:text-blue-400',
  equipment: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  livestock: 'bg-red-100    dark:bg-red-900/30    text-red-700    dark:text-red-400',
  oil:       'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  services:  'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  other:     'bg-gray-100   dark:bg-gray-800      text-gray-600   dark:text-gray-400',
}
const TYPE_COLOURS: Record<string, string> = {
  sell:  'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  buy:   'bg-blue-100    dark:bg-blue-900/30    text-blue-700    dark:text-blue-400',
  trade: 'bg-amber-100   dark:bg-amber-900/30   text-amber-700   dark:text-amber-400',
}

const getCategoryColour = (category: string | null) =>
  category ? (CATEGORY_COLOURS[category.toLowerCase()] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400') : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'

const getTypeColour = (type: string | null) =>
  type ? (TYPE_COLOURS[type.toLowerCase()] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400') : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'

type Listing = {
  id: string
  user_id: string
  title: string
  category: string | null
  type: string | null
  price: number | null
  price_negotiable: boolean | null
  description: string | null
  state: string | null
  condition: string | null
  image_urls: string[] | null
  is_closed: boolean
  is_featured: boolean | null
  featured_until: string | null
  created_at: string
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(price)

export default function MarketplaceClient({
  listings: initial,
  profileMap,
  userId,
  savedIds = [],
}: {
  listings: Listing[]
  profileMap: Record<string, { first_name: string | null; last_name: string | null; avatar_url: string | null; username: string | null }>
  userId: string
  savedIds?: string[]
}) {
  const savedSet = new Set(savedIds)
  const [listings, setListings]           = useState(initial)
  const [search, setSearch]               = useState('')
  const [sortBy, setSortBy]               = useState<'newest' | 'oldest' | 'price_low' | 'price_high'>('newest')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [conditionFilter, setConditionFilter] = useState('All')
  const [typeFilter, setTypeFilter]       = useState('All')
  const [stateFilter, setStateFilter]     = useState('All')
  const [statusFilter, setStatusFilter]   = useState<'All' | 'Open' | 'Closed'>('All')
  const [minPrice, setMinPrice]           = useState('')
  const [maxPrice, setMaxPrice]           = useState('')
  const [togglingId, setTogglingId]       = useState<string | null>(null)

  const handleToggleClosed = async (id: string, isClosed: boolean) => {
    setTogglingId(id)
    const supabase = createClient()
    await supabase.from('marketplace_listings').update({ is_closed: !isClosed }).eq('id', id)
    setListings(prev => prev.map(l => l.id === id ? { ...l, is_closed: !isClosed } : l))
    setTogglingId(null)
  }

  const filtered = listings.filter(l => {
    const matchesSearch   = !search || l.title.toLowerCase().includes(search.toLowerCase()) || (l.description ?? '').toLowerCase().includes(search.toLowerCase()) || (l.state ?? '').toLowerCase().includes(search.toLowerCase())
    const matchesCategory  = categoryFilter === 'All' || (l.category ?? '').toLowerCase() === categoryFilter.toLowerCase()
    const matchesCondition = conditionFilter === 'All' || (l.condition ?? '').toLowerCase() === conditionFilter.toLowerCase()
    const matchesType      = typeFilter === 'All' || (l.type ?? '').toLowerCase() === typeFilter.toLowerCase()
    const matchesState    = stateFilter === 'All' || (l.state ?? '').toLowerCase() === stateFilter.toLowerCase()
    const matchesStatus   = statusFilter === 'All' || (statusFilter === 'Closed' ? l.is_closed : !l.is_closed)
    const min = minPrice ? parseFloat(minPrice) : null
    const max = maxPrice ? parseFloat(maxPrice) : null
    const matchesMin = min === null || (l.price !== null && l.price >= min)
    const matchesMax = max === null || (l.price !== null && l.price <= max)
    return matchesSearch && matchesCategory && matchesCondition && matchesType && matchesState && matchesStatus && matchesMin && matchesMax
  })

  // Sort filtered results — featured listings float to top within their category.
  // Date.now() during render is intentional — `now` is captured once and used to
  // bucket featured-still-active listings. Refactor planned (H3 backlog) to pass
  // in a memoised snapshot.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now()
  const isFeaturedActive = (l: Listing) =>
    l.is_featured && l.featured_until && new Date(l.featured_until).getTime() > now

  const sorted = [...filtered].sort((a, b) => {
    // Category-level featuring: when a category filter is active, featured
    // listings in that category sort to the top. When "All" is selected,
    // featured listings still rise to the top within their category group.
    const aFeat = isFeaturedActive(a)
    const bFeat = isFeaturedActive(b)

    // If filtering by a specific category, featured in that category tops everything
    if (categoryFilter !== 'All') {
      if (aFeat !== bFeat) return aFeat ? -1 : 1
    } else {
      // "All" view: featured tops within same category
      if (a.category === b.category && aFeat !== bFeat) return aFeat ? -1 : 1
    }

    // Then apply user-chosen sort
    if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    if (sortBy === 'price_low') return (a.price ?? 0) - (b.price ?? 0)
    if (sortBy === 'price_high') return (b.price ?? 0) - (a.price ?? 0)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime() // newest
  })

  useSearchLog(search, 'marketplace', sorted.length)

  const hasActiveFilters = categoryFilter !== 'All' || conditionFilter !== 'All' || typeFilter !== 'All' || stateFilter !== 'All' || statusFilter !== 'All' || search || minPrice || maxPrice

  const inputClass = "w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
  const filterBtn  = (active: boolean) => `px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${active ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-green-400 dark:hover:border-green-500'}`

  return (
    <div>
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 mb-8 space-y-4">
        <input type="text" placeholder="Search listings..." value={search} onChange={e => setSearch(e.target.value)} className={inputClass} />
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => { setCategoryFilter(cat); if (cat.toLowerCase() !== 'equipment') setConditionFilter('All') }} className={filterBtn(categoryFilter === cat)}>{cat}</button>
          ))}
        </div>
        {categoryFilter.toLowerCase() === 'equipment' && (
          <div className="flex flex-wrap gap-2">
            {['All', 'New', 'Used'].map(cond => (
              <button key={cond} onClick={() => setConditionFilter(cond)} className={filterBtn(conditionFilter === cond)}>{cond === 'All' ? 'All Conditions' : cond}</button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {TYPES.map(type => <button key={type} onClick={() => setTypeFilter(type)} className={filterBtn(typeFilter === type)}>{type}</button>)}
        </div>
        <div className="flex flex-wrap gap-2">
          {(['All', 'Open', 'Closed'] as const).map(status => (
            <button key={status} onClick={() => setStatusFilter(status)} className={filterBtn(statusFilter === status)}>
              {status === 'All' ? 'All Status' : status}
            </button>
          ))}
        </div>
        <div className="pt-1 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Location</p>
          <select
            value={stateFilter}
            onChange={e => setStateFilter(e.target.value)}
            className={inputClass}
          >
            <option value="All">All states</option>
            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="pt-1 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Price range (₦)</p>
          <div className="flex items-center gap-3">
            <input type="number" placeholder="Min" value={minPrice} onChange={e => setMinPrice(e.target.value)} min={0} className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            <span className="text-gray-500 text-sm shrink-0">to</span>
            <input type="number" placeholder="Max" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} min={0} className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            {(minPrice || maxPrice) && (
              <button onClick={() => { setMinPrice(''); setMaxPrice('') }} className="text-xs text-gray-500 hover:text-red-500 dark:hover:text-red-400 shrink-0 transition-colors">Clear</button>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            {hasActiveFilters && (
              <button onClick={() => { setSearch(''); setCategoryFilter('All'); setConditionFilter('All'); setTypeFilter('All'); setStateFilter('All'); setStatusFilter('All'); setMinPrice(''); setMaxPrice('') }} className="text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium">
                Clear all filters
              </button>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400">{sorted.length} {sorted.length === 1 ? 'listing' : 'listings'}</p>
          </div>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="price_low">Price: Low → High</option>
            <option value="price_high">Price: High → Low</option>
          </select>
        </div>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={
            <svg aria-hidden="true" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
          }
          title={hasActiveFilters ? 'No listings match your filters' : 'No marketplace listings yet'}
          body={hasActiveFilters
            ? 'Try adjusting your search or price range, or clear the filters to see everything available.'
            : 'Be the first to list a product, equipment item or service on the marketplace.'}
          action={
            <PrimaryLink href="/marketplace/new">Post the first listing</PrimaryLink>
          }
          secondaryAction={
            hasActiveFilters ? (
              <button
                type="button"
                onClick={() => { setSearch(''); setCategoryFilter('All'); setConditionFilter('All'); setTypeFilter('All'); setStateFilter('All'); setStatusFilter('All'); setMinPrice(''); setMaxPrice('') }}
                className="inline-flex items-center justify-center border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors px-4 py-2.5"
              >
                Clear filters
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map(listing => {
            const isOwner  = listing.user_id === userId
            const isClosed = listing.is_closed ?? false
            const isFeatured = listing.is_featured && listing.featured_until && new Date(listing.featured_until) > new Date()
            return (
              <div key={listing.id} className={`relative bg-white dark:bg-gray-900 rounded-2xl border shadow-sm hover:shadow-md transition-all group flex flex-col ${isFeatured ? 'border-amber-300 dark:border-amber-600 ring-1 ring-amber-200 dark:ring-amber-800' : 'border-gray-100 dark:border-gray-800 hover:border-green-200 dark:hover:border-green-800'} ${isClosed ? 'opacity-70' : ''}`}>
                {/* Overlay bookmark so the card-level Link stays as the main target. */}
                <div className="absolute top-3 right-3 z-10">
                  <BookmarkButton
                    contentType="marketplace_listing"
                    contentId={listing.id}
                    initiallySaved={savedSet.has(listing.id)}
                    stopPropagation
                  />
                </div>
                <Link href={`/marketplace/${listing.id}`} className="block flex-1">
                  {listing.image_urls?.[0] && (
                    <div className="relative w-full aspect-[4/3] bg-gray-100 dark:bg-gray-800 rounded-t-2xl overflow-hidden">
                      <Image src={listing.image_urls[0]} alt={listing.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 672px" />
                      {listing.image_urls.length > 1 && (
                        <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
                          +{listing.image_urls.length - 1}
                        </span>
                      )}
                      {isFeatured && (
                        <span className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                          FEATURED
                        </span>
                      )}
                    </div>
                  )}
                  <div className="p-5">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {isFeatured && !listing.image_urls?.[0] && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">FEATURED</span>
                    )}
                    {listing.type && <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${getTypeColour(listing.type)}`}>{listing.type}</span>}
                    {listing.category && <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${getCategoryColour(listing.category)}`}>{listing.category}</span>}
                    {listing.condition && <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">{listing.condition}</span>}
                    {isClosed && <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">CLOSED</span>}
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors mb-2">{listing.title}</h3>
                  {listing.price !== null && (
                    <p className="text-lg font-bold text-green-700 dark:text-green-400 mb-1">
                      {formatPrice(listing.price)}
                      {listing.price_negotiable && <span className="text-xs font-normal text-gray-500 dark:text-gray-500 ml-1">(negotiable)</span>}
                    </p>
                  )}
                  {listing.description && <p className="text-sm text-gray-500 dark:text-gray-500 line-clamp-2 mb-3">{listing.description}</p>}
                  {listing.state && <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">📍 {listing.state}</p>}
                  <div className="flex items-center gap-2 mt-2">
                    {(() => {
                      const profile = profileMap[listing.user_id]
                      if (!profile) return <span className="text-xs text-gray-500 dark:text-gray-500">Anonymous</span>
                      const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Anonymous'
                      const href = profile.username ? `/u/${profile.username}` : `/directory/${listing.user_id}`
                      return (
                        <Link href={href} className="flex items-center gap-1.5 group" onClick={e => e.stopPropagation()}>
                          <UserAvatar src={profile.avatar_url} name={name} size="md" alt={name} />
                          <span className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                            {name}
                          </span>
                        </Link>
                      )
                    })()}
                    <span className="text-gray-300 dark:text-gray-700">·</span>
                    <span className="text-xs text-gray-500 dark:text-gray-500">{formatRelativeTime(listing.created_at)}</span>
                  </div>
                  </div>
                </Link>

                <div className="px-5 pb-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <LikeButton postId={listing.id} postType="listing" />
                    <ReportButton postId={listing.id} postType="listing" />
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => handleToggleClosed(listing.id, isClosed)}
                      disabled={togglingId === listing.id}
                      className={`text-xs px-2 py-1 rounded transition-colors disabled:opacity-50 ${
                        isClosed
                          ? 'text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300'
                          : 'text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300'
                      }`}
                    >
                      {togglingId === listing.id ? '…' : isClosed ? '🔓 Re-open' : '🔒 Close'}
                    </button>
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
