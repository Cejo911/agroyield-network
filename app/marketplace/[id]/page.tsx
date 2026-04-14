import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import AppNav from '@/app/components/AppNav'
import ListingActions from './ListingActions'
import CommentsSection from '@/app/components/CommentsSection'
import MessageButton from '@/app/components/MessageButton'
import ListingGallery from './ListingGallery'

const CATEGORY_COLOURS: Record<string, string> = {
  produce:   'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  inputs:    'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  equipment: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  livestock: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  oil:       'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  services:  'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  other:     'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
}
const TYPE_COLOURS: Record<string, string> = {
  sell:  'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  buy:   'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  trade: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
}

const getColour = (map: Record<string, string>, key: string | null): string => {
  if (!key) return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
  return map[key.toLowerCase()] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', maximumFractionDigits: 0,
  }).format(price)

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: listing } = await supabase
    .from('marketplace_listings')
    .select('*')
    .eq('id', id)
    .single()

  if (!listing) notFound()

  const isOwner  = user.id === listing.user_id
  const isClosed = listing.is_closed ?? false

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <Link href="/marketplace" className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 mb-4 transition-colors">
          ← Back to Marketplace
        </Link>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-8">

          {isClosed && (
            <div className="mb-5 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <span className="text-sm font-semibold text-red-600 dark:text-red-400">🔴 This listing is now closed</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mb-4">
            {listing.type && (
              <span className={`text-xs px-3 py-1 rounded-full font-medium capitalize ${getColour(TYPE_COLOURS, listing.type)}`}>
                {listing.type}
              </span>
            )}
            {listing.category && (
              <span className={`text-xs px-3 py-1 rounded-full font-medium capitalize ${getColour(CATEGORY_COLOURS, listing.category)}`}>
                {listing.category}
              </span>
            )}
            {listing.condition && (
              <span className="text-xs px-3 py-1 rounded-full font-medium capitalize bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {listing.condition}
              </span>
            )}
            {isClosed && (
              <span className="text-xs px-3 py-1 rounded-full font-semibold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                CLOSED
              </span>
            )}
          </div>

          {/* Product Images */}
          {listing.image_urls?.length > 0 && (
            <ListingGallery images={listing.image_urls} title={listing.title} />
          )}

          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">{listing.title}</h1>

          {listing.price !== null && (
            <p className="text-2xl font-bold text-green-700 dark:text-green-400 mb-1">
              {formatPrice(listing.price)}
              {listing.price_negotiable && (
                <span className="text-sm font-normal text-gray-400 dark:text-gray-500 ml-2">(negotiable)</span>
              )}
            </p>
          )}
          {listing.price === null && listing.type === 'trade' && (
            <p className="text-lg font-medium text-amber-600 dark:text-amber-400 mb-1">Open to trade offers</p>
          )}

          <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400 mt-4 mb-6">
            {listing.state && <p>📍 {listing.state}</p>}
            <p>🕒 {new Date(listing.created_at).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}</p>
          </div>

          {listing.description && (
            <div className="mb-6">
              <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Description</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">{listing.description}</p>
            </div>
          )}

          {!isOwner && !isClosed && (
            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
              <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Contact Seller</h2>
              {listing.contact && (
                <p className="text-gray-700 dark:text-gray-300 font-medium mb-3">{listing.contact}</p>
              )}
              <MessageButton
                recipientId={listing.user_id}
                label="Message Seller"
                className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg border border-green-600 text-green-600 hover:bg-green-600 hover:text-white transition-colors disabled:opacity-50"
              />
            </div>
          )}

          {isOwner && <ListingActions id={id} isClosed={isClosed} />}

          <CommentsSection postId={id} postType="listing" />
        </div>
      </main>
    </div>
  )
}
