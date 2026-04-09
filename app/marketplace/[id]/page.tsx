import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import AppNav from '@/app/components/AppNav'

const CATEGORY_COLOURS: Record<string, string> = {
  produce:   'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  inputs:    'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  equipment: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  livestock: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
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
  return map[key] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-8">
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
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{listing.title}</h1>

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

          {listing.contact && (
            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
              <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Contact Seller</h2>
              <p className="text-gray-700 dark:text-gray-300 font-medium">{listing.contact}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
