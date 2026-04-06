import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (!profile) notFound()

  const isOwnProfile = user.id === id

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
            <Link href="/directory" className="text-sm text-gray-600 hover:text-green-700 font-medium">
              ← Directory
            </Link>
            <Link href="/dashboard" className="text-sm text-gray-600 hover:text-green-700 font-medium">
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          {/* Avatar + name */}
          <div className="flex items-center gap-5 mb-6">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-2xl">
              {profile.first_name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {profile.first_name} {profile.last_name}
              </h1>
              {profile.role && (
                <span className="inline-block mt-1 text-sm bg-green-100 text-green-700 px-3 py-0.5 rounded-full font-medium capitalize">
                  {profile.role}
                </span>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-4 text-sm text-gray-600">
            {profile.institution && (
              <p>🏛 <span className="font-medium">{profile.institution}</span></p>
            )}
            {profile.location && (
              <p>📍 <span className="font-medium">{profile.location}</span></p>
            )}
            {profile.bio && (
              <div>
                <p className="font-semibold text-gray-800 mb-1">About</p>
                <p className="text-gray-600 leading-relaxed">{profile.bio}</p>
              </div>
            )}
            {profile.interests && profile.interests.length > 0 && (
              <div>
                <p className="font-semibold text-gray-800 mb-2">Areas of Interest</p>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((interest: string) => (
                    <span
                      key={interest}
                      className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Links */}
          {(profile.linkedin || profile.twitter || profile.website) && (
            <div className="mt-6 pt-6 border-t border-gray-100 flex flex-wrap gap-3">
              {profile.linkedin && (
                
                  href={profile.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm bg-blue-50 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  LinkedIn →
                </a>
              )}
              {profile.twitter && (
                
                  href={profile.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Twitter / X →
                </a>
              )}
              {profile.website && (
                
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm bg-green-50 text-green-700 px-4 py-2 rounded-lg hover:bg-green-100 transition-colors"
                >
                  Website →
                </a>
              )}
            </div>
          )}

          {/* Edit button if own profile */}
          {isOwnProfile && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <Link
                href="/profile"
                className="inline-block bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
              >
                Edit your profile
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
