'use client'
import { useState } from 'react'
import Link from 'next/link'
import LikeButton from '@/app/components/LikeButton'
import ReportButton from '@/app/components/ReportButton'

const CATEGORIES = ['All', 'Produce', 'Inputs', 'Equipment', 'Livestock', 'Services', 'Other']
const TYPES = ['All', 'Sell', 'Buy', 'Trade']

const CATEGORY_COLOURS: Record<string, string> = {
  produce: 'bg-green-100 text-green-700',
  inputs: 'bg-blue-100 text-blue-700',
  equipment: 'bg-orange-100 text-orange-700',
  livestock: 'bg-red-100 text-red-700',
  services: 'bg-purple-100 text-purple-700',
  other: 'bg-gray-100 text-gray-600',
}
const TYPE_COLOURS: Record<string, string> = {
  sell: 'bg-emerald-100 text-emerald-700',
  buy: 'bg-blue-100 text-blue-700',
  trade: 'bg-amber-100 text-amber-700',
}

const getCategoryColour = (category: string | null): string => {
  if (!category) return 'bg-gray-100 text-gray-600'
  return CATEGORY_COLOURS[category] ?? 'bg-gray-100 text-gray-600'
}
const getTypeColour = (type: string | null): string => {
  if (!type) return 'bg-gray-100 text-gray-600'
  return TYPE_COLOURS[type] ?? 'bg-gray-100 text-gray-600'
}

type Listing = {
  id: string
  title: string
  category: string | null
  type: string | null
  price: number | null
  price_negotiable: boolean | null
  description: string | null
  state: string | null
  created_at: string
}

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
const formatPrice = (price: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', maximumFractionDigits: 0,
  }).format(price)

export default function MarketplaceClient({ listings }: { listings: Listing[] }) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')

  const filtered = listings.filter(l => {
    const matchesSearch =
      !search ||
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      (l.description ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (l.state ?? '').toLowerCase().includes(search.toLowerCase())
    const matchesCategory =
      categoryFilter === 'All' ||
      (l.category ?? '').toLowerCase() === categoryFilter.toLowerCase()
    const matchesType =
      typeFilter === 'All' ||
      (l.type ?? '').toLowerCase() === typeFilter.toLowerCase()
    const min = minPrice ? parseFloat(minPrice) : null
    const max = maxPrice ? parseFloat(maxPrice) : null
    const matchesMin = min === null || (l.price !== null && l.price >= min)
    const matchesMax = max === null || (l.price !== null && l.price <= max)
    return matchesSearch && matchesCategory && matchesType && matchesMin && matchesMax
  })

  const hasActiveFilters = categoryFilter !== 'All' || typeFilter !== 'All' || search || minPrice || maxPrice

  return (
    <div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-8 space-y-4">
        <input
          type="text"
          placeholder="Search listings..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                categoryFilter === cat
                  ? 'bg-green-600 text-white border-green-600'
                  : 'border-gray-300 text-gray-600 hover:border-green-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
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

        {/* Price range */}
        <div className="pt-1 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 mb-2">Price range (₦)</p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              placeholder="Min"
              value={minPrice}
              onChange={e => setMinPrice(e.target.value)}
              min={0}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <span className="text-gray-400 text-sm shrink-0">to</span>
            <input
              type="number"
              placeholder="Max"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              min={0}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            {(minPrice || maxPrice) && (
              <button
                onClick={() => { setMinPrice(''); setMaxPrice('') }}
                className="text-xs text-gray-400 hover:text-red-500 shrink-0 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {hasActiveFilters && (
          <button
            onClick={() => { setSearch(''); setCategoryFilter('All'); setTypeFilter('All'); setMinPrice(''); setMaxPrice('') }}
            className="text-xs text-green-600 hover:text-green-700 font-medium"
          >
            Clear all filters
          </button>
        )}
      </div>

      <p className="text-sm text-gray-500 mb-5">
        {filtered.length} {filtered.length === 1 ? 'listing' : 'listings'} found
      </p>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🛒</p>
          <p className="font-medium">No listings match your filters</p>
          <p className="text-sm mt-1">Try adjusting your search or price range</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(listing => (
            /* Outer div owns card chrome — Link wraps only the content */
            <div
              key={listing.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-green-200 transition-all group flex flex-col"
            >
              <Link href={`/marketplace/${listing.id}`} className="block p-5 flex-1">
                <div className="flex flex-wrap gap-2 mb-3">
                  {listing.type && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${getTypeColour(listing.type)}`}>
                      {listing.type}
                    </span>
                  )}
                  {listing.category && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${getCategoryColour(listing.category)}`}>
                      {listing.category}
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors mb-2">
                  {listing.title}
                </h3>
                {listing.price !== null && (
                  <p className="text-lg font-bold text-green-700 mb-1">
                    {formatPrice(listing.price)}
                    {listing.price_negotiable && (
                      <span className="text-xs font-normal text-gray-400 ml-1">(negotiable)</span>
                    )}
                  </p>
                )}
                {listing.description && (
                  <p className="text-sm text-gray-400 line-clamp-2 mb-3">{listing.description}</p>
                )}
                <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
                  {listing.state && <span>📍 {listing.state}</span>}
                  <span>{timeAgo(listing.created_at)}</span>
                </div>
              </Link>

              {/* Like + Report live OUTSIDE the Link — no navigation risk */}
              <div className="px-5 pb-4 pt-3 border-t border-gray-100 flex items-center gap-4">
                <LikeButton postId={listing.id} postType="listing" />
                <ReportButton postId={listing.id} postType="listing" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
