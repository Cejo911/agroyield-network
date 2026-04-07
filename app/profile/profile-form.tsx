'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const ROLES = [
  { value: 'student',     label: 'Student' },
  { value: 'researcher',  label: 'Researcher' },
  { value: 'farmer',      label: 'Farmer' },
  { value: 'agripreneur', label: 'Agripreneur' },
]

const INTERESTS = [
  'Crop Science', 'Livestock', 'Agritech', 'Soil Health',
  'Irrigation', 'Food Processing', 'Agricultural Finance',
  'Climate & Sustainability', 'Supply Chain', 'Research & Development',
]

const INSTITUTIONS = [
  // Federal Universities
  'University of Lagos (UNILAG)',
  'University of Ibadan (UI)',
  'Ahmadu Bello University (ABU)',
  'University of Nigeria, Nsukka (UNN)',
  'Obafemi Awolowo University (OAU)',
  'University of Benin (UNIBEN)',
  'University of Ilorin (UNILORIN)',
  'University of Jos (UNIJOS)',
  'University of Maiduguri (UNIMAID)',
  'University of Port Harcourt (UNIPORT)',
  'University of Calabar (UNICAL)',
  'University of Uyo (UNIUYO)',
  'Bayero University, Kano (BUK)',
  'Nnamdi Azikiwe University, Awka (UNIZIK)',
  'Usman Danfodiyo University, Sokoto (UDUS)',
  'Modibbo Adama University of Technology, Yola (MAUTECH)',
  'National Open University of Nigeria (NOUN)',
  'Nigerian Defence Academy (NDA)',
  'Federal University of Technology, Akure (FUTA)',
  'Federal University of Technology, Minna (FUTMINNA)',
  'Federal University of Technology, Owerri (FUTO)',
  'Federal University, Oye-Ekiti (FUOYE)',
  'Federal University, Dutse',
  'Federal University, Lokoja',
  'Federal University, Lafia',
  'Federal University, Wukari',
  'Federal University, Ndufu-Alike (FUNAI)',
  'Federal University, Birnin Kebbi',
  'Federal University, Kashere',
  'Federal University, Otuoke',
  'Federal University, Gusau',
  'Federal University, Gashua',
  'Federal University, Dutsin-Ma',
  // Agricultural Universities & Colleges
  'Federal University of Agriculture, Abeokuta (FUNAAB)',
  'Federal University of Agriculture, Makurdi (FUAM)',
  'Michael Okpara University of Agriculture, Umudike (MOUAU)',
  'Landmark University, Omu-Aran',
  'Federal College of Agriculture, Ibadan',
  'Federal College of Agriculture, Akure',
  'Federal College of Agriculture, Ishiagu',
  'Federal College of Agriculture, Moor Plantation',
  'College of Agriculture, Kabba',
  'College of Agriculture, Jalingo',
  'College of Agriculture, Lafia',
  // State Universities
  'Lagos State University (LASU)',
  'Ladoke Akintola University of Technology (LAUTECH)',
  'Olabisi Onabanjo University (OOU)',
  'Ekiti State University (EKSU)',
  'Rivers State University',
  'Delta State University (DELSU)',
  'Ambrose Alli University (AAU)',
  'Enugu State University of Science and Technology (ESUT)',
  'Imo State University (IMSU)',
  'Abia State University (ABSU)',
  'Anambra State University (ANSU)',
  'Benue State University',
  'Nasarawa State University',
  'Kaduna State University (KASU)',
  'Kano State University of Science and Technology (KUST)',
  'Kwara State University',
  'Plateau State University',
  'Gombe State University',
  'Adamawa State University (ADSU)',
  'Taraba State University',
  'Yobe State University',
  'Sokoto State University',
  'Kebbi State University of Science and Technology',
  'Cross River University of Technology (CRUTECH)',
  'Akwa Ibom State University (AKSU)',
  'Niger Delta University (NDU)',
  'Edo State University, Uzairue',
  'Adekunle Ajasin University (AAUA)',
  'Ignatius Ajuru University of Education',
  'University of Africa, Toru-Orua',
  'Kogi State University',
  'Niger State University',
  'Bauchi State University',
  'Borno State University',
  'Yusuf Maitama Sule University',
  // Private Universities
  'Covenant University',
  'Babcock University',
  'American University of Nigeria (AUN)',
  'Afe Babalola University (ABUAD)',
  'Bowen University',
  'Bells University of Technology',
  'Pan-Atlantic University',
  "Redeemer's University",
  'Benson Idahosa University',
  'Crawford University',
  'Lead City University',
  'Joseph Ayo Babalola University (JABU)',
  'Elizade University',
  'Mountain Top University',
  'Caleb University',
  'Madonna University',
  'Igbinedion University',
  'Anchor University, Lagos',
  'Samuel Adegboyega University',
  'Wesley University, Ondo',
  'Novena University',
  'Augustine University, Ilara-Epe',
  'Southwestern University, Nigeria',
  'Caritas University',
  'Godfrey Okoye University',
  'Salem University',
  'Adeleke University',
  'Achievers University',
  'Base University, Abuja',
  'Baba Ahmed University, Kano',
  'Veritas University, Abuja',
  'Dominican University, Ibadan',
  'Spiritan University, Nneochi',
  'Coal City University, Enugu',
  'Hezekiah University, Umudi',
  'Chrisland University, Abeokuta',
  // Research Institutes
  'International Institute of Tropical Agriculture (IITA)',
  'National Cereals Research Institute (NCRI)',
  'National Horticultural Research Institute (NIHORT)',
  'National Root Crops Research Institute (NRCRI)',
  'National Animal Production Research Institute (NAPRI)',
  'National Veterinary Research Institute (NVRI)',
  'Cocoa Research Institute of Nigeria (CRIN)',
  'Rubber Research Institute of Nigeria (RRIN)',
  'Forestry Research Institute of Nigeria (FRIN)',
  'Nigerian Stored Products Research Institute (NSPRI)',
  'Lake Chad Research Institute (LCRI)',
  'Institute for Agricultural Research (IAR)',
  'Nigerian Institute for Oceanography and Marine Research (NIOMR)',
  // Government & Organisations
  'Federal Ministry of Agriculture and Food Security',
  'Bank of Agriculture (BOA)',
  'Nigerian Agricultural Insurance Corporation (NAIC)',
  'National Agricultural Land Development Authority (NALDA)',
  'All Farmers Association of Nigeria (AFAN)',
  'Agricultural and Rural Management Training Institute (ARMTI)',
  'National Agricultural Seeds Council (NASC)',
]

type ProfileFormProps = {
  userId: string
  initialData: {
    first_name:  string | null
    last_name:   string | null
    role:        string | null
    bio:         string | null
    location:    string | null
    institution: string | null
    interests:   string[] | null
    linkedin:    string | null
    twitter:     string | null
    website:     string | null
    avatar_url:  string | null
    phone:       string | null
    whatsapp:    string | null
  }
}

export default function ProfileForm({ userId, initialData }: ProfileFormProps) {
  const router = useRouter()
  const [loading,         setLoading]         = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [message,         setMessage]         = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [form, setForm] = useState({
    first_name:  initialData.first_name  || '',
    last_name:   initialData.last_name   || '',
    role:        initialData.role        || '',
    bio:         initialData.bio         || '',
    location:    initialData.location    || '',
    institution: initialData.institution || '',
    interests:   initialData.interests   || [] as string[],
    linkedin:    initialData.linkedin    || '',
    twitter:     initialData.twitter     || '',
    website:     initialData.website     || '',
    avatar_url:  initialData.avatar_url  || '',
    phone:       initialData.phone       || '',
    whatsapp:    initialData.whatsapp    || '',
  })

  // ── Completeness ──
  const fieldChecks = [
    { key: 'first_name',  label: 'First name',                 filled: !!form.first_name },
    { key: 'last_name',   label: 'Last name',                  filled: !!form.last_name },
    { key: 'role',        label: 'Your role',                  filled: !!form.role },
    { key: 'bio',         label: 'Short bio',                  filled: !!form.bio },
    { key: 'location',    label: 'Location',                   filled: !!form.location },
    { key: 'institution', label: 'Institution / Organisation', filled: !!form.institution },
    { key: 'interests',   label: 'Areas of interest',          filled: form.interests.length > 0 },
    { key: 'avatar_url',  label: 'Profile photo',              filled: !!form.avatar_url },
    { key: 'phone',       label: 'Phone number',               filled: !!form.phone },
    { key: 'whatsapp',    label: 'WhatsApp number',            filled: !!form.whatsapp },
    { key: 'linkedin',    label: 'LinkedIn profile',           filled: !!form.linkedin },
    { key: 'twitter',     label: 'Twitter / X handle',         filled: !!form.twitter },
    { key: 'website',     label: 'Personal website',           filled: !!form.website },
  ]

  const missing      = fieldChecks.filter(f => !f.filled)
  const percent      = Math.round(((fieldChecks.length - missing.length) / fieldChecks.length) * 100)
  const barColor     = percent >= 70 ? '#16a34a' : percent >= 40 ? '#ca8a04' : '#dc2626'
  const percentColor = percent >= 70 ? 'text-green-600' : percent >= 40 ? 'text-yellow-600' : 'text-red-500'

  // ── Avatar ──
  const initials = [form.first_name, form.last_name]
    .filter(Boolean)
    .map(n => n.charAt(0).toUpperCase())
    .join('') || '?'

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select an image file.' })
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image must be under 2MB.' })
      return
    }
    setAvatarUploading(true)
    setMessage(null)
    try {
      const supabase = createClient()
      const ext  = file.name.split('.').pop() ?? 'jpg'
      const path = `${userId}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${data.publicUrl}?t=${Date.now()}`
      setForm(prev => ({ ...prev, avatar_url: url }))
    } catch (_err) {
      setMessage({ type: 'error', text: 'Failed to upload photo. Please try again.' })
    } finally {
      setAvatarUploading(false)
    }
  }

  // ── Interests ──
  const toggleInterest = (interest: string) => {
    setForm(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest],
    }))
  }

  // ── Submit ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      const res  = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, id: userId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save profile')
      setMessage({ type: 'success', text: 'Profile saved successfully! Redirecting...' })
      setTimeout(() => router.push('/dashboard'), 1500)
    } catch (err: unknown) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Something went wrong',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* ── Completeness nudge ── */}
      {percent < 100 ? (
        <div className="mb-8 bg-gray-50 border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">Profile completeness</span>
            <span className={`text-sm font-bold ${percentColor}`}>{percent}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div className="h-2 rounded-full transition-all duration-300"
              style={{ width: `${percent}%`, backgroundColor: barColor }} />
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Fill in the remaining fields to help the community connect with you:
          </p>
          <div className="flex flex-wrap gap-2">
            {missing.map(f => (
              <span key={f.key}
                className="inline-flex items-center gap-1 text-xs bg-white text-gray-600 border border-gray-300 rounded-full px-3 py-1">
                + {f.label}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-8 flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
          <span className="text-xl">✅</span>
          <div>
            <p className="text-sm font-semibold text-green-800">Profile complete!</p>
            <p className="text-xs text-green-600">Your profile is fully set up. Save to apply your changes.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ── Avatar ── */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative group">
            {form.avatar_url ? (
              <div
                style={{ backgroundImage: `url(${form.avatar_url})` }}
                className="w-24 h-24 rounded-full bg-cover bg-center border-4 border-white shadow-md"
                role="img"
                aria-label="Profile photo"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-green-600 flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-md">
                {initials}
              </div>
            )}
            <label htmlFor="avatar-upload"
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <span className="text-white text-xs font-medium text-center px-1">
                {avatarUploading ? 'Uploading…' : '📷 Change'}
              </span>
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              disabled={avatarUploading}
              onChange={handleAvatarUpload}
            />
          </div>
          <p className="text-xs text-gray-400">
            {avatarUploading ? 'Uploading your photo…' : 'Click photo to upload · Max 2MB'}
          </p>
        </div>

        {/* ── Basic Info ── */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input type="text" value={form.first_name}
                onChange={e => setForm(prev => ({ ...prev, first_name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input type="text" value={form.last_name}
                onChange={e => setForm(prev => ({ ...prev, last_name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
          </div>
        </div>

        {/* ── Role ── */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Role</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ROLES.map(role => (
              <button key={role.value} type="button"
                onClick={() => setForm(prev => ({ ...prev, role: role.value }))}
                className={`py-3 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${
                  form.role === role.value
                    ? 'border-green-600 bg-green-50 text-green-700'
                    : 'border-gray-200 text-gray-600 hover:border-green-300'
                }`}>
                {role.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Bio ── */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">About You</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea value={form.bio} rows={4}
                onChange={e => setForm(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Tell the community a bit about yourself..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location (State / Country)</label>
                <input type="text" value={form.location}
                  onChange={e => setForm(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g. Lagos, Nigeria"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Institution / Organisation</label>
                <input
                  type="text"
                  value={form.institution}
                  onChange={e => setForm(prev => ({ ...prev, institution: e.target.value }))}
                  placeholder="e.g. University of Ibadan"
                  list="institutions-list"
                  autoComplete="off"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <datalist id="institutions-list">
                  {INSTITUTIONS.map(inst => (
                    <option key={inst} value={inst} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>
        </div>

        {/* ── Interests ── */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Areas of Interest</h2>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map(interest => (
              <button key={interest} type="button" onClick={() => toggleInterest(interest)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  form.interests.includes(interest)
                    ? 'bg-green-600 text-white border-green-600'
                    : 'border-gray-300 text-gray-600 hover:border-green-400'
                }`}>
                {interest}
              </button>
            ))}
          </div>
        </div>

        {/* ── Contact Details ── */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Contact Details <span className="text-sm font-normal text-gray-400">(Optional)</span>
          </h2>
          <p className="text-xs text-gray-500 mb-4">Only visible to logged-in members — not shown to guests.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input type="tel" value={form.phone}
                onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+234 800 000 0000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
              <input type="tel" value={form.whatsapp}
                onChange={e => setForm(prev => ({ ...prev, whatsapp: e.target.value }))}
                placeholder="+234 800 000 0000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
          </div>
        </div>

        {/* ── Links ── */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Links <span className="text-sm font-normal text-gray-400">(Optional)</span></h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
              <input type="url" value={form.linkedin}
                onChange={e => setForm(prev => ({ ...prev, linkedin: e.target.value }))}
                placeholder="https://linkedin.com/in/yourname"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Twitter / X URL</label>
              <input type="url" value={form.twitter}
                onChange={e => setForm(prev => ({ ...prev, twitter: e.target.value }))}
                placeholder="https://x.com/yourhandle"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input type="url" value={form.website}
                onChange={e => setForm(prev => ({ ...prev, website: e.target.value }))}
                placeholder="https://yourwebsite.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
          </div>
        </div>

        {/* ── Submit ── */}
        {message && (
          <div className={`rounded-lg px-4 py-3 text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.text}
          </div>
        )}
        <button type="submit" disabled={loading || avatarUploading}
          className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors">
          {loading ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </>
  )
}
