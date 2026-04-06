'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function Home() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase
      .from('waitlist_signups')
      .insert([{ email, source: 'waitlist_page' }])
    if (error && error.code !== '23505') {
      setError('Something went wrong. Please try again.')
    } else {
      setSubmitted(true)
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        <p className="text-green-400 text-sm font-semibold uppercase tracking-widest mb-4">
          For Builders · Join the Founding Members
        </p>
        <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
          Agriculture is a <span className="text-green-400">Business.</span> Build Yours.
        </h1>
        <p className="text-gray-400 text-lg mb-8">
          AgroYield Network is Nigeria&apos;s first digital platform connecting students,
          researchers, farmers, agropreneurs, and institutions — grants, mentorship,
          markets, and research, all in one place.
        </p>
        {submitted ? (
          <div className="bg-green-900 border border-green-500 rounded-xl p-6">
            <p className="text-green-400 text-xl font-semibold">You&apos;re on the list! 🌱</p>
            <p className="text-gray-400 mt-2">We&apos;ll be in touch when we launch.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-black font-semibold px-6 py-3 rounded-lg whitespace-nowrap"
            >
              {loading ? 'Joining…' : 'Join the Waitlist →'}
            </button>
          </form>
        )}
        {error && <p className="text-red-400 mt-3 text-sm">{error}</p>}
        <div className="flex justify-center gap-8 mt-10 text-gray-500 text-sm">
          <span>🇳🇬 Built for Nigeria</span>
          <span>🌍 Open to all of Africa</span>
          <span>🆓 Free for founding members</span>
        </div>
      </div>
    </main>
  )
}
