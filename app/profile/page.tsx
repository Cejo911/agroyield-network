import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileForm from './profile-form'
import AppNav from '@/app/components/AppNav'

const PROFILE_FIELDS: { key: string; label: string }[] = [
  { key: 'first_name',   label: 'First name' },
  { key: 'last_name',    label: 'Last name' },
  { key: 'role',         label: 'Your role' },
  { key: 'bio',          label: 'Short bio' },
  { key: 'location',     label: 'Location' },
  { key: 'institution',  label: 'Institution / Organisation' },
  { key: 'interests',    label: 'Areas of interest' },
  { key: 'linkedin',     label: 'LinkedIn profile' },
  { key: 'twitter',      label: 'Twitter / X handle' },
  { key: 'website',      label: 'Personal website' },
]

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Calculate completeness server-side
const profileRecord = (profile ?? {}) as Record<string, unknown>
const missing  = PROFILE_FIELDS.filter(({ key }) => !profileRecord[key])
const filled   = PROFILE_FIELDS.length - missing.length
const percent  = Math.round((filled / PROFILE_FIELDS.length) * 100)
  const filled  = PROFILE_FIELDS.length - missing.length
  const percent = Math.round((filled / PROFILE_FIELDS.length) * 100)

  const barColor =
    percent >= 70 ? '#16a34a' :
    percent >= 40 ? '#ca8a04' :
                    '#dc2626'

  const percentColor =
    percent >= 70 ? 'text-green-600' :
    percent >= 40 ? 'text-yellow-600' :
                    'text-red-500'

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />
      <div className="max-w-2xl mx-auto px-4 py-12">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Your Profile</h1>
          <p className="text-gray-500 mt-1">Help the community know who you are</p>
        </div>

        {/* ── Profile completeness nudge ── */}
        {percent < 100 ? (
          <div className="mb-6 bg-white rounded-2xl border border-green-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">
                Profile completeness
              </span>
              <span className={`text-sm font-bold ${percentColor}`}>
                {percent}%
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
              <div
                className="h-2 rounded-full"
                style={{ width: `${percent}%`, backgroundColor: barColor, transition: 'width 0.5s ease' }}
              />
            </div>

            <p className="text-xs text-gray-500 mb-3">
              Fill in the remaining fields so the AgroYield community can connect with you:
            </p>

            <div className="flex flex-wrap gap-2">
              {missing.map(({ key, label }) => (
                
                  key={key}
                  href="#profile-form"
                  className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-3 py-1 hover:bg-green-100 transition-colors"
                >
                  <span aria-hidden="true">+</span> {label}
                </a>
              ))}
            </div>
          </div>
        ) : (
          /* ── 100 % complete banner ── */
          <div className="mb-6 flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl p-4">
            <span className="text-2xl" aria-hidden="true">✅</span>
            <div>
              <p className="text-sm font-semibold text-green-800">Profile complete!</p>
              <p className="text-xs text-green-600">
                Your profile is fully set up — the community can find and connect with you.
              </p>
            </div>
          </div>
        )}

        {/* ── Form card ── */}
        <div id="profile-form" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <ProfileForm
            userId={user.id}
            initialData={{
              first_name:  profile?.first_name  ?? null,
              last_name:   profile?.last_name   ?? null,
              role:        profile?.role        ?? null,
              bio:         profile?.bio         ?? null,
              location:    profile?.location    ?? null,
              institution: profile?.institution ?? null,
              interests:   profile?.interests   ?? null,
              linkedin:    profile?.linkedin    ?? null,
              twitter:     profile?.twitter     ?? null,
              website:     profile?.website     ?? null,
            }}
          />
        </div>

      </div>
    </div>
  )
}
