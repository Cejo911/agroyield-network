import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DirectoryClient from './directory-client'

export default async function DirectoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, role, bio, location, institution, interests')
    .not('role', 'is', null)
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
            <Link href="/profile" className="text-sm text-gray-600 hover:text-green-700 font-medium">
              My Profile
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Member Directory</h1>
          <p className="text-gray-500 mt-1">
            Connect with students, researchers, farmers and agripreneurs across Africa.
          </p>
        </div>

        <DirectoryClient profiles={profiles ?? []} />
      </main>
    </div>
  )
}
