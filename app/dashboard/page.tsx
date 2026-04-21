import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import OnboardingWizard from '@/app/components/OnboardingWizard'
import FAQAccordion from '@/app/components/FAQAccordion'
import PageShell from '@/app/components/design/PageShell'
import PageHeader from '@/app/components/design/PageHeader'
import ModuleCard from '@/app/components/design/ModuleCard'
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any
  const { data: profile } = await supabaseAny
    .from('profiles')
    .select(
      'first_name, last_name, role, has_onboarded, ' +
      'account_type, institution_display_name, institution_type, is_institution_verified'
    )
    .eq('id', user.id)
    .single()

  const isInstitution = profile?.account_type === 'institution'
  const isVerifiedInstitution = !!profile?.is_institution_verified

  // Greeting: institutions see their display name, individuals see their first name
  const greetingName = isInstitution
    ? (profile?.institution_display_name || profile?.first_name || user.email?.split('@')[0] || 'there')
    : (profile?.first_name || user.email?.split('@')[0] || 'there')

  // Profile completeness differs by account type:
  //   • individuals need first_name + role
  //   • institutions need first_name (contact) + institution_display_name + institution_type
  const profileComplete = isInstitution
    ? !!(profile?.first_name && profile?.institution_display_name && profile?.institution_type)
    : !!(profile?.first_name && profile?.role)

  // Institutions skip the individual-oriented OnboardingWizard entirely.
  // Their onboarding is: complete profile → wait for admin verification.
  const onboarding = !isInstitution && profile && !profile.has_onboarded ? (
    <OnboardingWizard
      userId={user.id}
      firstName={profile.first_name || ''}
      lastName={profile.last_name || ''}
      email={user.email || ''}
    />
  ) : null

  return (
    <PageShell maxWidth="6xl" beforeMain={onboarding}>
      <PageHeader
        title={<>Welcome, {greetingName} {isInstitution ? '🏛' : '👋'}</>}
        description={isInstitution ? 'Your institution workspace.' : 'What would you like to do today?'}
      />

      {!profileComplete && (
        <div className="mb-8 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-400">
              {isInstitution ? 'Finish setting up your institution profile' : 'Complete your profile'}
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-500 mt-0.5">
              {isInstitution
                ? 'Add your institution details, contact person, and CAC number so we can submit you for admin verification.'
                : 'Let the community know who you are and what you are working on.'}
            </p>
          </div>
          <Link
            href="/profile"
            className="inline-block bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap"
          >
            {isInstitution ? 'Continue setup' : 'Set up profile'}
          </Link>
        </div>
      )}

      {profileComplete && isInstitution && !isVerifiedInstitution && (
        <div className="mb-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-blue-800 dark:text-blue-300">Pending admin verification</p>
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-0.5">
              Our team is reviewing <strong>{profile?.institution_display_name}</strong>. You can browse the network now; posting unlocks once you&rsquo;re verified. We&rsquo;ll email you the moment it&rsquo;s done.
            </p>
          </div>
          <Link
            href="/profile"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap"
          >
            Review profile
          </Link>
        </div>
      )}

      {profileComplete && isInstitution && isVerifiedInstitution && (
        <div className="mb-8 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-5 flex items-center gap-3">
          <span className="text-xl">✅</span>
          <div>
            <p className="font-semibold text-emerald-800 dark:text-emerald-300">Verified institution</p>
            <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-0.5">
              You can now post opportunities, grants, research, and marketplace listings on behalf of {profile?.institution_display_name}.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map(module => (
          <ModuleCard
            key={module.title}
            href={module.href}
            title={module.title}
            description={module.description}
            icon={module.icon}
          />
        ))}
      </div>
      <FAQAccordion items={MODULE_FAQS.dashboard} title="Frequently Asked Questions" subtitle="Common questions about the Dashboard" compact />
    </PageShell>
  )
}
