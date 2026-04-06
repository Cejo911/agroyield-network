import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import AppNav from '@/app/components/AppNav'

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
const getColour = (map: Record<string, string>, key: string | null): string => {
  if (!key) return 'bg-gray-100 text-gray-600'
  return map[key] ?? 'bg-gray-100 text-gray-600'
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
    <div className="min-h-screen bg-gray-50">
      <AppNav />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
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
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{listing.title}</h1>
          {listing.price !== null && (
            <p className="text-2xl font-bold text-green-700 mb-1">
              {formatPrice(listing.price)}
              {listing.price_negotiable && (
                <span className="text-sm font-normal text-gray-400 ml-2">(negotiable)</span>
              )}
            </p>
          )}
          {listing.price === null && listing.type === 'trade' && (
            <p className="text-lg font-medium text-amber-600 mb-1">Open to trade offers</p>
          )}
          <div className="space-y-2 text-sm text-gray-500 mt-4 mb-6">
            {listing.state && <p>📍 {listing.state}</p>}
            <p>🕒 {new Date(listing.created_at).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}</p>
          </div>
          {listing.description && (
            <div className="mb-6">
              <h2 className="font-semibold text-gray-800 mb-2">Description</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{listing.description}</p>
            </div>
          )}
          {listing.contact && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h2 className="font-semibold text-gray-800 mb-2">Contact Seller</h2>
              <p className="text-gray-700 font-medium">{listing.contact}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
