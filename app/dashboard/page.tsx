import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AppNav from '@/app/components/AppNav'
import OnboardingWizard from '@/app/components/OnboardingWizard'

const MODULES = [
  {
    title: 'Directory',
    description: 'Find and connect with students, researchers, farmers and agripreneurs across Africa.',
    icon: '👥',
    href: '/directory',
  },
  {
    title: 'Opportunities',
    description: 'Jobs, fellowships, internships, partnerships, and training in the agricultural sector.',
    icon: '🌱',
    href: '/opportunities',
  },
  {
    title: 'Grant Tracker',
    description: 'Discover funding opportunities and track your grant applications from draft to award.',
    icon: '💰',
    href: '/grants',
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
  {
    title: 'Mentorship',
    description: 'Connect with experienced mentors or share your expertise with the next generation.',
    icon: '🎓',
    href: '/mentorship',
  },
  {
    title: 'Business Suite',
    description: 'Create invoices, manage customers and products, and track your agribusiness revenue.',
    icon: '💼',
    href: '/business',
  },
  {
    title: 'Community',
    description: 'Share ideas, ask questions, celebrate wins, and connect with the agri community.',
    icon: '🌍',
    href: '/community',
  },
]

export default async function Dashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, role, has_onboarded')
    .eq('id', user.id)
    .single()

  const firstName = profile?.first_name || user.email?.split('@')[0] || 'there'
  const profileComplete = !!(profile?.first_name && profile?.role)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      {profile && !profile.has_onboarded && (
        <OnboardingWizard
          userId={user.id}
          firstName={profile.first_name || ''}
          lastName={profile.last_name || ''}
          email={user.email || ''}
        />
      )}
      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome, {firstName} 👋
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">What would you like to do today?</p>
        </div>

        {!profileComplete && (
          <div className="mb-8 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-400">Complete your profile</p>
              <p className="text-sm text-amber-700 dark:text-amber-500 mt-0.5">
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
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 hover:shadow-md hover:border-green-200 dark:hover:border-green-800 transition-all group"
            >
              <div className="text-3xl mb-3">{module.icon}</div>
              <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors mb-2">
                {module.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{module.description}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
