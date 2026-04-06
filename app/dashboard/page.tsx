import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AppNav from '@/app/components/AppNav'

const MODULES = [
  {
    title: 'Directory',
    description: 'Find and connect with students, researchers, farmers and agripreneurs across Africa.',
    icon: '👥',
    href: '/directory',
  },
  {
    title: 'Opportunities',
    description: 'Grants, fellowships, jobs, and partnerships in the agricultural sector.',
    icon: '🌱',
    href: '/opportunities',
  },
  {
    title: 'Price Tracker',
    description: 'Real-time commodity prices reported by members across Nigeria.',
    icon: '📊',
    href: '/prices',
  },
  {
    title: 'Marketplace',
    description: 'Buy, sell and trade agricultural products, inputs and equipment.',
    icon: '🛒',
    href: '/marketplace',
  },
  {
    title: 'Research Board',
    description: 'Share findings, collaborate on studies, and access agricultural research.',
    icon: '🔬',
    href: '/research',
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
      <AppNav />

      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome, {firstName} 👋</h1>
          <p className="text-gray-500 mt-1">What would you like to do today?</p>
        </div>

        {!profileComplete && (
          <div className="mb-8 bg-amber-50 border border-amber-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-amber-800">Complete your profile</p>
              <p className="text-sm text-amber-700 mt-0.5">
                Let the community know who you are and what you are working on.
              </p>
            </div>
            <Link
              href="/profile"
              className="inline-block bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap"
            >
              Set up profile
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map(module => (
            <Link
              key={module.title}
              href={module.href}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md hover:border-green-200 transition-all group"
            >
              <div className="text-3xl mb-3">{module.icon}</div>
              <h3 className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors mb-2">
                {module.title}
              </h3>
              <p className="text-sm text-gray-500">{module.description}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
