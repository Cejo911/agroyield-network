import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import AppNav from '@/app/components/AppNav'
import ApplyButton from './apply-button'

const TYPE_COLOURS: Record<string, string> = {
  grant:       'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  fellowship:  'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  job:         'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  partnership: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  internship:  'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  training:    'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400',
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: opportunity } = await supabase
    .from('opportunities')
    .select('title, description, organisation, type')
    .eq('id', id)
    .single()

  if (!opportunity) return { title: 'Opportunity Not Found' }

  const description = opportunity.description
    ? opportunity.description.slice(0, 160)
    : `${opportunity.type ?? 'Opportunity'} at ${opportunity.organisation ?? 'AgroYield Network'}`

  return {
    title: opportunity.title,
    description,
    openGraph: {
      title: `${opportunity.title} | AgroYield Network`,
      description,
      url: `https://agroyield.africa/opportunities/${id}`,
    },
    twitter: {
      title: `${opportunity.title} | AgroYield Network`,
      description,
    },
  }
}

export default async function OpportunityPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: opportunity } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', id)
    .single()

  if (!opportunity) notFound()

  const isExpired = opportunity.deadline
    ? new Date(opportunity.deadline) < new Date()
    : false

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {user ? (
        <AppNav />
      ) : (
        <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🌾</span>
              <span className="font-bold text-green-700 dark:text-green-400 text-lg hidden sm:block">
                AgroYield Network
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/login"
                className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-green-700 dark:hover:text-green-400 transition-colors">
                Log in
              </Link>
              <Link href="/register"
                className="text-sm font-semibold bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                Sign up free
              </Link>
            </div>
          </div>
        </header>
      )}

      <main className="max-w-2xl mx-auto px-4 py-10">
        {user && (
          <Link href="/opportunities"
            className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-green-700 dark:hover:text-green-400 transition-colors mb-6">
            ← Back to Opportunities
          </Link>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-8">
          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            {opportunity.type && (
              <span className={`text-xs px-3 py-1 rounded-full font-medium capitalize ${
                TYPE_COLOURS[opportunity.type] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}>
                {opportunity.type}
              </span>
            )}
            {isExpired && (
              <span className="text-xs px-3 py-1 rounded-full font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                Expired
              </span>
            )}
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">{opportunity.title}</h1>

          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-6">
            {opportunity.organisation && (
              <p>🏛 <span className="font-medium text-gray-800 dark:text-gray-200">{opportunity.organisation}</span></p>
            )}
            {opportunity.location && (
              <p>📍 <span className="font-medium text-gray-800 dark:text-gray-200">{opportunity.location}</span></p>
            )}
            {opportunity.deadline && (
              <p>
                📅 Deadline:{' '}
                <span className={`font-medium ${isExpired ? 'text-red-500 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'}`}>
                  {new Date(opportunity.deadline).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </span>
              </p>
            )}
          </div>

          {opportunity.description && (
            <div className="mb-6">
              <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">About this opportunity</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
                {opportunity.description}
              </p>
            </div>
          )}

          {opportunity.requirements && (
            <div className="mb-6">
              <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Requirements</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
                {opportunity.requirements}
              </p>
            </div>
          )}

          {/* Apply / Sign-up CTA */}
          <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
            {user ? (
              opportunity.url && (
                <ApplyButton
                  opportunityId={opportunity.id}
                  url={opportunity.url}
                  isExpired={isExpired}
                />
              )
            ) : (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-5 text-center">
                <p className="text-sm font-semibold text-green-800 dark:text-green-300 mb-1">
                  Join AgroYield Network to apply
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mb-4">
                  Connect with agricultural opportunities across Africa — free to join.
                </p>
                <div className="flex gap-3 justify-center">
                  <Link href="/register"
                    className="text-sm font-semibold bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 transition-colors">
                    Create free account
                  </Link>
                  <Link href="/login"
                    className="text-sm font-medium text-green-700 dark:text-green-400 border border-green-300 dark:border-green-700 px-5 py-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                    Log in
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
