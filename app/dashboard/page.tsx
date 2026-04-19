import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AppNav from '@/app/components/AppNav'
import OnboardingWizard from '@/app/components/OnboardingWizard'
import FAQAccordion from '@/app/components/FAQAccordion'
import { MODULE_FAQS } from '@/lib/faq-data'

/* ------------------------------------------------------------------ */
/* Module catalogue                                                    */
/* ------------------------------------------------------------------ */

type ModuleAccent = 'green' | 'amber' | 'sky' | 'plum' | 'clay' | 'teal'

type DashboardModule = {
  title: string
  description: string
  icon: string
  href: string
  accent: ModuleAccent
  badge?: string
  meta?: string
}

const PRIMARY_MODULES: DashboardModule[] = [
  {
    title: 'Community',
    description: 'Discussions, polls, wins, and ideas from members near you.',
    icon: '🌍',
    href: '/community',
    accent: 'green',
    meta: 'Updated daily',
  },
  {
    title: 'Opportunities',
    description: 'Jobs, internships, partnerships and training across agriculture.',
    icon: '🚀',
    href: '/opportunities',
    accent: 'amber',
    badge: 'Hiring',
  },
  {
    title: 'Grant Tracker',
    description: 'Find funding and track your applications from draft to award.',
    icon: '💰',
    href: '/grants',
    accent: 'sky',
    badge: 'Live grants',
  },
  {
    title: 'Marketplace',
    description: 'Buy, sell, and trade products, inputs, and equipment with verified members.',
    icon: '🤝',
    href: '/marketplace',
    accent: 'clay',
    meta: 'Verified sellers',
  },
  {
    title: 'Price Tracker',
    description: 'Today\u2019s commodity prices reported by members near you.',
    icon: '🏷️',
    href: '/prices',
    accent: 'teal',
    meta: 'Member-reported',
  },
  {
    title: 'Business Suite',
    description: 'Invoices, customers and revenue for your agribusiness.',
    icon: '💼',
    href: '/business',
    accent: 'plum',
    badge: 'Pro tools',
  },
]

const SECONDARY_MODULES: DashboardModule[] = [
  {
    title: 'Directory',
    description: 'Find and connect with people who share your interests.',
    icon: '📇',
    href: '/directory',
    accent: 'clay',
  },
  {
    title: 'Mentorship',
    description: 'Learn from experienced mentors or guide the next generation.',
    icon: '🧭',
    href: '/mentorship',
    accent: 'amber',
  },
  {
    title: 'Research Board',
    description: 'Explore and collaborate on agricultural research and findings.',
    icon: '🔬',
    href: '/research',
    accent: 'sky',
  },
]

const ACCENT_BG: Record<ModuleAccent, string> = {
  green: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  sky:   'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  plum:  'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  clay:  'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  teal:  'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
}

const ACCENT_BORDER: Record<ModuleAccent, string> = {
  green: 'group-hover:border-t-green-500',
  amber: 'group-hover:border-t-amber-500',
  sky:   'group-hover:border-t-sky-500',
  plum:  'group-hover:border-t-purple-500',
  clay:  'group-hover:border-t-orange-500',
  teal:  'group-hover:border-t-teal-500',
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function getLagosGreeting(): string {
  // Use Africa/Lagos timezone explicitly so it works for any deployment region.
  const hour = parseInt(
    new Intl.DateTimeFormat('en-NG', {
      timeZone: 'Africa/Lagos',
      hour: 'numeric',
      hour12: false,
    }).format(new Date()),
    10,
  )
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatNgnCompact(value: number): string {
  if (value >= 1_000_000_000) return `₦${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `₦${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `₦${(value / 1_000).toFixed(0)}k`
  return `₦${value}`
}

function profileCompletionScore(p: {
  first_name: string | null
  last_name: string | null
  role: string | null
  bio: string | null
  location: string | null
  avatar_url: string | null
  phone: string | null
  interests: string[] | null
} | null): number {
  if (!p) return 0
  const fields = [
    p.first_name,
    p.last_name,
    p.role,
    p.bio,
    p.location,
    p.avatar_url,
    p.phone,
    p.interests && p.interests.length > 0 ? 'has' : null,
  ]
  const filled = fields.filter(Boolean).length
  return Math.round((filled / fields.length) * 100)
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default async function Dashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Profile + stats in parallel — single round-trip latency.
  const [profileRes, oppsRes, grantsRes, membersRes, pricesRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('first_name, last_name, role, has_onboarded, bio, location, avatar_url, phone, interests')
      .eq('id', user.id)
      .single(),
    supabase
      .from('opportunities')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
    supabase
      .from('grants')
      .select('amount_max')
      .eq('status', 'open'),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('price_reports')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .gte('reported_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
  ])

  const profile = profileRes.data
  const firstName = profile?.first_name || user.email?.split('@')[0] || 'there'
  const greeting = getLagosGreeting()
  const completion = profileCompletionScore(profile)
  const profileComplete = completion >= 75

  const oppsCount = oppsRes.count ?? 0
  const memberCount = membersRes.count ?? 0
  const recentPriceCount = pricesRes.count ?? 0
  const grantsTotal = (grantsRes.data ?? []).reduce(
    (sum, g) => sum + (typeof g.amount_max === 'number' ? g.amount_max : 0),
    0,
  )

  // Hero photograph — open-licensed Unsplash, harvest scene.
  // Documented in IP Strategy §5 (Copyright Notices) — replace with owned photography post-Beta.
  const heroBg =
    'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1600&q=80&auto=format&fit=crop'

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

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* ---------- Hero ---------- */}
        <section
          className="relative overflow-hidden rounded-3xl mb-8 shadow-sm border border-green-100 dark:border-green-900/40"
          style={{
            backgroundImage: `linear-gradient(120deg, rgba(22,101,52,0.92) 0%, rgba(34,139,87,0.78) 55%, rgba(132,168,82,0.55) 100%), url(${heroBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="px-6 sm:px-10 py-10 sm:py-14 text-white">
            <p className="text-sm uppercase tracking-[0.18em] text-green-100/80 font-medium">
              {greeting}, {firstName}
            </p>
            <h1 className="mt-2 text-3xl sm:text-4xl font-bold leading-tight max-w-2xl">
              Your agriculture network, at a glance.
            </h1>
            <p className="mt-3 text-green-50/90 max-w-xl text-sm sm:text-base leading-relaxed">
              Catch up on what your community is working on, find opportunities, and keep your
              business moving — all in one place.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/community"
                className="inline-flex items-center gap-2 bg-white text-green-800 hover:bg-green-50 font-semibold text-sm px-5 py-2.5 rounded-full shadow-sm transition-colors"
              >
                Explore community
              </Link>
              <Link
                href="/profile"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white border border-white/30 font-semibold text-sm px-5 py-2.5 rounded-full transition-colors"
              >
                {profileComplete ? 'View your profile' : 'Complete your profile'}
              </Link>
            </div>
          </div>
        </section>

        {/* ---------- Profile completion strip (only if incomplete) ---------- */}
        {!profileComplete && (
          <section className="mb-8 bg-white dark:bg-gray-900 rounded-2xl border border-amber-100 dark:border-amber-900/40 p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-amber-500">✨</span>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    Profile {completion}% complete
                  </p>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Members with complete profiles get more responses and discover better matches.
                </p>
                <div className="mt-3 h-2 w-full max-w-md rounded-full bg-amber-50 dark:bg-amber-900/30 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all"
                    style={{ width: `${Math.max(completion, 5)}%` }}
                  />
                </div>
              </div>
              <Link
                href="/profile"
                className="inline-flex bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors whitespace-nowrap"
              >
                Finish setup
              </Link>
            </div>
          </section>
        )}

        {/* ---------- Pill stats ---------- */}
        <section className="mb-10 flex flex-wrap gap-2">
          <StatPill label="Profile" value={`${completion}%`} accent="green" />
          <StatPill label="Open opportunities" value={oppsCount.toString()} accent="amber" />
          <StatPill label="Grants live" value={formatNgnCompact(grantsTotal)} accent="sky" />
          <StatPill label="Members" value={memberCount.toString()} accent="plum" />
          <StatPill label="Price reports (7d)" value={recentPriceCount.toString()} accent="teal" />
        </section>

        {/* ---------- Primary modules ---------- */}
        <section className="mb-10">
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Get started</h2>
            <span className="text-xs text-gray-400 dark:text-gray-500">Tap a card to open</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PRIMARY_MODULES.map(m => (
              <ModuleCard key={m.title} module={m} />
            ))}
          </div>
        </section>

        {/* ---------- Secondary modules ---------- */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">More to explore</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {SECONDARY_MODULES.map(m => (
              <Link
                key={m.title}
                href={m.href}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 flex items-center gap-3 hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-sm transition-all"
              >
                <span
                  className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg ${ACCENT_BG[m.accent]}`}
                >
                  {m.icon}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{m.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{m.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <FAQAccordion
          items={MODULE_FAQS.dashboard}
          title="Frequently Asked Questions"
          subtitle="Common questions about the Dashboard"
          compact
        />
      </main>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Small presentational components (server-safe)                       */
/* ------------------------------------------------------------------ */

function StatPill({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent: ModuleAccent
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium border border-transparent ${ACCENT_BG[accent]}`}
    >
      <span className="font-semibold">{value}</span>
      <span className="opacity-75">{label}</span>
    </div>
  )
}

function ModuleCard({ module: m }: { module: DashboardModule }) {
  return (
    <Link
      href={m.href}
      className={`group relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 border-t-4 border-t-transparent shadow-sm p-6 hover:shadow-md hover:-translate-y-0.5 transition-all ${ACCENT_BORDER[m.accent]}`}
    >
      {m.badge && (
        <span
          className={`absolute top-4 right-4 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${ACCENT_BG[m.accent]}`}
        >
          {m.badge}
        </span>
      )}
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 ${ACCENT_BG[m.accent]}`}
      >
        {m.icon}
      </div>
      <h3 className="font-semibold text-gray-900 dark:text-white text-base mb-1.5">
        {m.title}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{m.description}</p>
      {m.meta && (
        <p className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          {m.meta}
        </p>
      )}
    </Link>
  )
}
