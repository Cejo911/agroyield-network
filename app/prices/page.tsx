import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PricesClient from './prices-client'
import AppNav from '@/app/components/AppNav'

export default async function PricesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: reports } = await supabase
    .from('price_reports')
    .select('id, commodity, category, price, unit, market_name, state, reported_at')
    .order('reported_at', { ascending: false })
    .limit(100)

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />
      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Price Tracker</h1>
            <p className="text-gray-500 mt-1">
              Live commodity prices reported by members across Nigeria.
            </p>
          </div>
          <Link
            href="/prices/submit"
            className="bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
          >
            Report a price
          </Link>
        </div>
        <PricesClient reports={reports ?? []} />
      </main>
    </div>
  )
}
