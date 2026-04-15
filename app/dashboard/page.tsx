import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AppNav from '@/app/components/AppNav'
import OnboardingWizard from '@/app/components/OnboardingWizard'
import FAQAccordion from '@/app/components/FAQAccordion'
import { MODULE_FAQS } from '@/lib/faq-data'

const MODULES = [
  {
    title: 'Community',
    description: 'Join the conversation — discussions, polls, wins, and ideas from the community.',
    icon: '🌍',
    href: '/community',
  },
  {
    title: 'Opportunities',
    description: 'Discover jobs, internships, partnerships and training across agriculture.',
    icon: '🚀',
    href: '/opportunities',
  },
  {
    title: 'Grant Tracker',
    description: 'Find funding and track your applications from draft to award.',
    icon: '💰',
    href: '/grants',
  },
  {
    title: 'Marketplace',
    description: 'Buy, sell, and trade products, inputs, and equipment with verified members.',
    icon: '🤝',
    href: '/marketplace',
  },
  {
    title: 'Price Tracker',
    description: 'Check today\'s commodity prices reported by members near you.',
    icon: '🏷️',
    href: '/prices',
  },
  {
    title: 'Directory',
    description: 'Find and connect with people who share your agricultural interests.',
    icon: '📇',
    href: '/directory',
  },
  {
    title: 'Mentorship',
    description: 'Learn from experienced mentors or guide the next generation.',
    icon: '🧭',
    href: '/mentorship',
  },
  {
    title: 'Research Board',
    description: 'Explore and collaborate on agricultural research and findings.',
    icon: '🔬',
    href: '/research',
  },
  {
    title: 'Business Suite',
    description: 'Manage invoices, customers, and revenue for your agribusiness.',
    icon: '💼',
    href: '/business',
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
        <FAQAccordion items={MODULE_FAQS.dashboard} title="Frequently Asked Questions" subtitle="Common questions about the Dashboard" compact />
      </main>
    </div>
  )
}
