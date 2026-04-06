import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import SignOutButton from './signout-button'

const MODULES = [
  {
    title: 'Connections',
    description: 'Find and connect with students, researchers, farmers and agripreneurs across Africa.',
    icon: '🤝',
  },
  {
    title: 'Opportunities',
    description: 'Grants, fellowships, jobs, and partnerships in the agricultural sector.',
    icon: '🌱',
  },
  {
    title: 'Price Tracker',
    description: 'Real-time commodity prices from markets across Nigeria.',
    icon: '📊',
  },
  {
    title: 'Marketplace',
    description: 'Buy, sell and trade agricultural products, inputs and equipment.',
    icon: '🛒',
  },
  {
    title: 'Research Board',
    description: 'Share findings, collaborate on studies, and access agricultural research.',
    icon: '🔬',
  },
]

export default async function Dashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, role')
    .eq('id', user.id)
    .single()

  const firstName = profile?.first_name || user.email?.split('@')[0] || 'there'
  const profileComplete = !!(profile?.first_name && profile?.role)

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
            <Link
              href="/profile"
              className="text-sm text-gray-600 hover:text-green-700 font-medium"
            >
              My Profile
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {firstName} 👋
          </h1>
          <p className="text-gray-500 mt-1">
            Your dashboard — the platform is being built. Stay tuned.
          </p>
        </div>

        {/* Profile completion banner */}
        {!profileComplete && (
          <div className="mb-8 bg-amber-50 border border-amber-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-amber-800">Complete your profile</p>
              <p className="text-sm text-amber-700 mt-0.5">
                Let the community know who you are and what you're working on.
              </p>
            </div>
            <Link
              href="/profile"
              className="inline-block bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap"
            >
              Set up profile →
            </Link>
          </div>
        )}

        {/* Module cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map(module => (
            <div
              key={module.title}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
            >
              <div className="text-3xl mb-3">{module.icon}</div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-gray-900">{module.title}</h3>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                  Coming soon
                </span>
              </div>
              <p className="text-sm text-gray-500">{module.description}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
