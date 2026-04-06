import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import OpportunitiesClient from './opportunities-client'

export default async function OpportunitiesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: opportunities } = await supabase
    .from('opportunities')
    .select('id, title, type, organisation, location, description, deadline, created_at')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌾</span>
            <span className="font-bold text-green-700 text-lg">AgroYield Network</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-gray-600 hover:text-green-700 font-medium">
              Dashboard
            </Link>
            <Link href="/directory" className="text-sm text-gray-600 hover:text-green-700 font-medium">
              Directory
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Opportunities</h1>
            <p className="text-gray-500 mt-1">
              Grants, fellowships, jobs and partnerships in agriculture.
            </p>
          </div>
          <Link
            href="/opportunities/new"
            className="bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
          >
            Post opportunity
          </Link>
        </div>

        <OpportunitiesClient opportunities={opportunities ?? []} />
      </main>
    </div>
  )
}
