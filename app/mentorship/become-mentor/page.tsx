'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AppNav from '@/app/components/AppNav'
import { useToast } from '@/app/components/Toast'
import { getEffectiveTier } from '@/lib/tiers'

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
  const { showError } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [moduleDisabled, setModuleDisabled] = useState(false)
  const [verificationRequired, setVerificationRequired] = useState(false)
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null)
  const [rejectionReason, setRejectionReason] = useState<string | null>(null)
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

      // Check mentorship settings
      const { data: settingsRows } = await (supabase as any)
        .from('settings').select('key, value').in('key', ['mentorship_enabled', 'mentorship_requires_verification'])
      const settingsMap: Record<string, string> = {}
      for (const s of (settingsRows ?? [])) settingsMap[s.key] = s.value

      if (settingsMap.mentorship_enabled === 'false') {
        setModuleDisabled(true)
        setLoading(false)
        return
      }

      // Check subscription requirement
      if (settingsMap.mentorship_requires_verification === 'true') {
        const { data: userProfile } = await (supabase as any)
          .from('profiles').select('subscription_tier, subscription_expires_at').eq('id', user.id).single()
        const effectiveTier = getEffectiveTier(userProfile ?? {})
        if (effectiveTier === 'free') {
          setVerificationRequired(true)
          setLoading(false)
          return
        }
      }

      // Fetch mentor profile and user profile in parallel
      const [{ data: existing }, { data: profile }] = await Promise.all([
        supabase.from('mentor_profiles').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('profiles').select('linkedin, location').eq('id', user.id).single(),
      ])

      if (existing) {
        setIsEdit(true)
        setApprovalStatus((existing.approval_status as 'pending' | 'approved' | 'rejected' | null) ?? 'pending')
        setRejectionReason(existing.rejection_reason ?? null)
        setForm({
          headline: existing.headline || '',
          expertise: existing.expertise || [],
          bio: existing.bio || '',
          years_experience: String(existing.years_experience || ''),
          max_mentees: String(existing.max_mentees || 5),
          availability: existing.availability || 'Open',
          session_format: existing.session_format || ['video', 'chat'],
          languages: (existing.languages || ['English']).join(', '),
          location: existing.location || profile?.location || '',
          linkedin_url: existing.linkedin_url || profile?.linkedin || '',
        })
      } else {
        // Pre-fill from profile for new mentors
        setForm(f => ({
          ...f,
          location: profile?.location || '',
          linkedin_url: profile?.linkedin || '',
        }))
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

    // Shared payload — note is_active and approval_status are controlled by
    // the server-side approval flow, not the applicant. On new insert we
    // always start at pending. On edit we leave approval_status alone so
    // editing a bio doesn't accidentally re-approve (or un-approve) someone.
    const basePayload = {
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
      updated_at: new Date().toISOString(),
    }

    let error
    if (isEdit) {
      const result = await supabase.from('mentor_profiles').update(basePayload).eq('user_id', user.id)
      error = result.error
    } else {
      const result = await supabase.from('mentor_profiles').insert({
        ...basePayload,
        user_id: user.id,
        // New applications start inactive + pending — admin approval flips both.
        is_active: false,
        approval_status: 'pending',
      })
      error = result.error
    }

    setSaving(false)

    if (error) {
      showError(`Failed to save mentor profile: ${error.message}`)
      return
    }
    // On first submit show the pending banner instead of punting to the
    // browser (which would hide the mentor's own profile since it's not yet
    // approved). Re-loads the page state so the banner picks up approval_status.
    if (!isEdit) {
      setIsEdit(true)
      setApprovalStatus('pending')
      window.scrollTo({ top: 0, behavior: 'smooth' })
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

  if (moduleDisabled) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <main className="max-w-2xl mx-auto px-4 py-20 text-center">
        <Image src="/logo-icon-colored.png" alt="AgroYield Network" width={56} height={56} className="mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Mentorship Coming Soon</h1>
        <p className="text-gray-500 dark:text-gray-400">
          The mentorship module is currently being set up. Check back soon!
        </p>
      </main>
    </div>
  )

  if (verificationRequired) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <main className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Subscribers Only</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Mentor registration is available to Pro and Growth subscribers. Upgrade your plan to unlock this feature.
        </p>
        <a href="/pricing" className="inline-block bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors">
          View Plans
        </a>
      </main>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {isEdit ? 'Edit Mentor Profile' : 'Become a Mentor'}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
          Share your expertise with the next generation of agricultural professionals.
        </p>

        {/* Approval status banner — only shown for existing applications.
            Pending: friendly "waiting on review" note. Rejected: show the
            admin-supplied reason so the applicant can address it and resubmit. */}
        {isEdit && approvalStatus === 'pending' && (
          <div className="mb-6 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="text-xl">⏳</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Application under review</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
                  Your mentor application is with the AgroYield team. We review new mentors to keep the network high-trust —
                  most decisions land within 2 business days. You&apos;ll get an email the moment it&apos;s approved.
                </p>
              </div>
            </div>
          </div>
        )}
        {isEdit && approvalStatus === 'rejected' && (
          <div className="mb-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="text-xl">⚠️</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-800 dark:text-red-300">Application not approved</p>
                {rejectionReason ? (
                  <p className="text-xs text-red-700 dark:text-red-400 mt-1 leading-relaxed">
                    Reviewer note: <span className="italic">{rejectionReason}</span>
                  </p>
                ) : (
                  <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                    Your application wasn&apos;t approved on this round.
                  </p>
                )}
                <p className="text-xs text-red-700 dark:text-red-400 mt-2">
                  Update your details below and save — we&apos;ll re-review automatically.
                </p>
              </div>
            </div>
          </div>
        )}
        {isEdit && approvalStatus === 'approved' && (
          <div className="mb-6 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="text-xl">✓</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-green-800 dark:text-green-300">You&apos;re an approved mentor</p>
                <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                  Your profile is visible in the mentor browser. Edit details below — admin approval persists.
                </p>
              </div>
            </div>
          </div>
        )}

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
