import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileForm from './profile-form'
import AppNav from '@/app/components/AppNav'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Explicit field-by-field check — no dynamic key access, fully type-safe
  const fieldStatus = [
    { key: 'first_name',  label: 'First name',                filled: !!profile?.first_name },
    { key: 'last_name',   label: 'Last name',                 filled: !!profile?.last_name },
    { key: 'role',        label: 'Your role',                 filled: !!profile?.role },
    { key: 'bio',         label: 'Short bio',                 filled: !!profile?.bio },
    { key: 'location',    label: 'Location',                  filled: !!profile?.location },
    { key: 'institution', label: 'Institution / Organisation', filled: !!profile?.institution },
    { key: 'interests',   label: 'Areas of interest',         filled: !!profile?.interests },
    { key: 'linkedin',    label: 'LinkedIn profile',          filled: !!profile?.linkedin },
    { key: 'twitter',     label: 'Twitter / X handle',        filled: !!profile?.twitter },
    { key: 'website',     label: 'Personal website',          filled: !!profile?.website },
  ]

  const missing = fieldStatus.filter(f => !f.filled)
  const percent  = Math.round(((fieldStatus.length - missing.length) / fieldStatus.length) * 100)

  const barColor =
    percent >= 70 ? '#16a34a' :
    percent >= 40 ? '#ca8a04' : '#dc2626'

  const percentColor =
    percent >= 70 ? 'text-green-600' :
    percent >= 40 ? 'text-yellow-600' : 'text-red-500'

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />
      <div className="max-w-2xl mx-auto px-4 py-12">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Your Profile</h1>
          <p className="text-gray-500 mt-1">Help the community know who you are</p>
        </div>

        {percent < 100 ? (
          <div className="mb-6 bg-white rounded-2xl border border-green-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">Profile completeness</span>
              <span className={`text-sm font-bold ${percentColor}`}>{percent}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
              <div
                className="h-2 rounded-full"
                style={{ width: `${percent}%`, backgroundColor: barColor }}
              />
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Fill in the remaining fields so the AgroYield community can connect with you:
            </p>
            <div className="flex flex-wrap gap-2">
              {missing.map(f => (
                
                  key={f.key}
                  href="#profile-form"
                  className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-3 py-1 hover:bg-green-100 transition-colors"
                >
                  + {f.label}
                </a>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-6 flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl p-4">
            <span className="text-2xl">✅</span>
            <div>
              <p className="text-sm font-semibold text-green-800">Profile complete!</p>
              <p className="text-xs text-green-600">
                Your profile is fully set up — the community can find and connect with you.
              </p>
            </div>
          </div>
        )}

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
