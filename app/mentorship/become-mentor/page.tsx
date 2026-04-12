'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AppNav from '@/app/components/AppNav'

const EXPERTISE_TAGS = [
  'Crop Farming', 'Poultry', 'Aquaculture', 'Livestock', 'Agribusiness',
  'Agritech', 'Food Processing', 'Supply Chain', 'Research', 'Finance',
  'Marketing', 'Policy', 'Sustainability', 'Organic Farming', 'Irrigation',
]

const SESSION_FORMATS = [
  { value: 'video', label: 'Video Call' },
  { value: 'chat', label: 'Chat / Messaging' },
  { value: 'phone', label: 'Phone Call' },
  { value: 'in_person', label: 'In Person' },
]

export default function BecomeMentorPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [form, setForm] = useState({
    headline: '',
    expertise: [] as string[],
    bio: '',
    years_experience: '',
    max_mentees: '5',
    availability: 'Open',
    session_format: ['video', 'chat'] as string[],
    languages: 'English',
    location: '',
    linkedin_url: '',
  })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: existing } = await supabase
        .from('mentor_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (existing) {
        setIsEdit(true)
        setForm({
          headline: existing.headline || '',
          expertise: existing.expertise || [],
          bio: existing.bio || '',
          years_experience: String(existing.years_experience || ''),
          max_mentees: String(existing.max_mentees || 5),
          availability: existing.availability || 'Open',
          session_format: existing.session_format || ['video', 'chat'],
          languages: (existing.languages || ['English']).join(', '),
          location: existing.location || '',
          linkedin_url: existing.linkedin_url || '',
        })
      }
      setLoading(false)
    }
    load()
  }, [])

  function toggleTag(tag: string) {
    setForm(f => ({
      ...f,
      expertise: f.expertise.includes(tag) ? f.expertise.filter(t => t !== tag) : [...f.expertise, tag],
    }))
  }

  function toggleFormat(val: string) {
    setForm(f => ({
      ...f,
      session_format: f.session_format.includes(val) ? f.session_format.filter(v => v !== val) : [...f.session_format, val],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      user_id: user.id,
      headline: form.headline.trim(),
      expertise: form.expertise,
      bio: form.bio.trim() || null,
      years_experience: parseInt(form.years_experience) || 0,
      max_mentees: parseInt(form.max_mentees) || 5,
      availability: form.availability,
      session_format: form.session_format,
      languages: form.languages.split(',').map(l => l.trim()).filter(Boolean),
      location: form.location.trim() || null,
      linkedin_url: form.linkedin_url.trim() || null,
      is_active: true,
      updated_at: new Date().toISOString(),
    }

    let error
    if (isEdit) {
      const result = await supabase.from('mentor_profiles').update(payload).eq('user_id', user.id)
      error = result.error
    } else {
      const result = await supabase.from('mentor_profiles').insert(payload)
      error = result.error
    }

    setSaving(false)

    if (error) {
      alert(`Failed to save mentor profile: ${error.message}`)
      return
    }
    router.push('/mentorship')
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <div className="text-gray-400 text-sm p-8 text-center">Loading...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {isEdit ? 'Edit Mentor Profile' : 'Become a Mentor'}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
          Share your expertise with the next generation of agricultural professionals.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Headline */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Headline <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Poultry farming specialist with 15 years experience"
              value={form.headline}
              onChange={e => setForm({ ...form, headline: e.target.value })}
              required
              maxLength={200}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Expertise tags */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Areas of Expertise <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {EXPERTISE_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                    form.expertise.includes(tag)
                      ? 'bg-green-700 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            {form.expertise.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">Select at least one area</p>
            )}
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Bio</label>
            <textarea
              placeholder="Tell potential mentees about your background, experience, and what you can help with..."
              value={form.bio}
              onChange={e => setForm({ ...form, bio: e.target.value })}
              rows={4}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>

          {/* Two-column row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Years of Experience</label>
              <input
                type="number"
                min="0"
                max="50"
                value={form.years_experience}
                onChange={e => setForm({ ...form, years_experience: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Max Active Mentees</label>
              <input
                type="number"
                min="1"
                max="50"
                value={form.max_mentees}
                onChange={e => setForm({ ...form, max_mentees: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Availability */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Availability</label>
            <select
              value={form.availability}
              onChange={e => setForm({ ...form, availability: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="Open">Open — accepting new mentees</option>
              <option value="Limited">Limited — only accepting select requests</option>
              <option value="Waitlist">Waitlist — full, but accepting waitlist</option>
              <option value="Closed">Closed — not accepting requests right now</option>
            </select>
          </div>

          {/* Session formats */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Session Formats</label>
            <div className="flex flex-wrap gap-2">
              {SESSION_FORMATS.map(sf => (
                <button
                  key={sf.value}
                  type="button"
                  onClick={() => toggleFormat(sf.value)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                    form.session_format.includes(sf.value)
                      ? 'bg-green-700 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {sf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Two-column row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Location</label>
              <input
                type="text"
                placeholder="e.g. Lagos, Nigeria"
                value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Languages</label>
              <input
                type="text"
                placeholder="English, Yoruba, Hausa"
                value={form.languages}
                onChange={e => setForm({ ...form, languages: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* LinkedIn */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">LinkedIn Profile <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              type="url"
              placeholder="https://linkedin.com/in/yourname"
              value={form.linkedin_url}
              onChange={e => setForm({ ...form, linkedin_url: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || form.expertise.length === 0 || !form.headline.trim()}
              className="flex-1 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold py-2.5 rounded-lg disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : isEdit ? 'Update Profile' : 'Create Mentor Profile'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
