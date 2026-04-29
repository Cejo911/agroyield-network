'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import UserAvatar from '@/app/components/design/UserAvatar'

const ROLES = [
  { value: 'student',     label: 'Student' },
  { value: 'researcher',  label: 'Researcher' },
  { value: 'farmer',      label: 'Farmer' },
  { value: 'agripreneur', label: 'Agripreneur' },
]

const INSTITUTION_TYPES = [
  { value: 'university',    label: 'University & Research Institute' },
  { value: 'government',    label: 'Government Agency' },
  { value: 'ngo',           label: 'NGO & Foundation' },
  { value: 'agri_company',  label: 'Agri-Company & Cooperative' },
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
    first_name:    string | null
    last_name:     string | null
    role:          string | null
    bio:           string | null
    location:      string | null
    institution:   string | null
    institution_2: string | null
    institution_3: string | null
    interests:     string[] | null
    linkedin:      string | null
    twitter:       string | null
    facebook:      string | null
    tiktok:        string | null
    website:       string | null
    avatar_url:    string | null
    phone:         string | null
    whatsapp:      string | null
    gender:        string | null
    date_of_birth: string | null
    notify_on_login?: boolean | null
    account_type?:             string | null
    institution_type?:         string | null
    institution_display_name?: string | null
    contact_person_name?:      string | null
    contact_person_role?:      string | null
    institution_website?:      string | null
    institution_cac?:          string | null
    is_institution_verified?:  boolean | null
    open_to_opportunities?:        boolean | null
    open_to_opportunities_until?:  string  | null
  }
}

const normalizePhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('234')) return digits.slice(3)
  if (digits.startsWith('0')) return digits.slice(1)
  return digits
}

// Shared input class
const inputCls = 'w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500'

export default function ProfileForm({ userId, initialData }: ProfileFormProps) {
  const router = useRouter()
  const [loading,         setLoading]         = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [message,         setMessage]         = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [form, setForm] = useState({
    first_name:    initialData.first_name    || '',
    last_name:     initialData.last_name     || '',
    role:          initialData.role          || '',
    bio:           initialData.bio           || '',
    location:      initialData.location      || '',
    institution:   initialData.institution   || '',
    institution_2: initialData.institution_2 || '',
    institution_3: initialData.institution_3 || '',
    interests:     initialData.interests     || [] as string[],
    linkedin:      initialData.linkedin      || '',
    twitter:       initialData.twitter       || '',
    facebook:      initialData.facebook      || '',
    tiktok:        initialData.tiktok        || '',
    website:       initialData.website       || '',
    avatar_url:    initialData.avatar_url    || '',
    phone:         initialData.phone         || '',
    whatsapp:      initialData.whatsapp      || '',
    gender:        initialData.gender        || '',
    date_of_birth: initialData.date_of_birth || '',
    notify_on_login: initialData.notify_on_login ?? true,
    account_type:             initialData.account_type             || 'individual',
    institution_type:         initialData.institution_type         || '',
    institution_display_name: initialData.institution_display_name || '',
    contact_person_name:      initialData.contact_person_name      || '',
    contact_person_role:      initialData.contact_person_role      || '',
    institution_website:      initialData.institution_website      || '',
    institution_cac:          initialData.institution_cac          || '',
    open_to_opportunities:       initialData.open_to_opportunities       ?? false,
    open_to_opportunities_until: initialData.open_to_opportunities_until || '',
  })

  const isInstitution = form.account_type === 'institution'

  // ── Completeness ──
  const individualChecks = [
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
  const institutionChecks = [
    { key: 'institution_display_name', label: 'Institution name',    filled: !!form.institution_display_name },
    { key: 'institution_type',         label: 'Institution type',    filled: !!form.institution_type },
    { key: 'contact_person_name',      label: 'Contact person',     filled: !!form.contact_person_name },
    { key: 'bio',                      label: 'About your institution', filled: !!form.bio },
    { key: 'location',                 label: 'Location',           filled: !!form.location },
    { key: 'interests',                label: 'Areas of interest',  filled: form.interests.length > 0 },
    { key: 'avatar_url',               label: 'Logo / Photo',       filled: !!form.avatar_url },
    { key: 'phone',                    label: 'Phone number',       filled: !!form.phone },
    { key: 'institution_website',      label: 'Website',            filled: !!form.institution_website },
    { key: 'linkedin',                 label: 'LinkedIn page',      filled: !!form.linkedin },
  ]
  const fieldChecks = isInstitution ? institutionChecks : individualChecks
  const missing      = fieldChecks.filter(f => !f.filled)
  const percent      = Math.round(((fieldChecks.length - missing.length) / fieldChecks.length) * 100)
  const barColor     = percent >= 70 ? '#16a34a' : percent >= 40 ? '#ca8a04' : '#dc2626'
  const percentColor = percent >= 70 ? 'text-green-600 dark:text-green-400' : percent >= 40 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-500 dark:text-red-400'

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
      // Route through /api/profile/avatar instead of calling
      // supabase.storage directly. Direct browser-side uploads were
      // failing with "new row violates row-level security policy"
      // even on a correctly-shaped path — the browser supabase
      // client's JWT wasn't reaching storage, so auth.uid() resolved
      // to NULL on the server and the policy denied. The endpoint
      // reads the auth session from the SSR cookie (which works) and
      // writes via the service-role admin client (which bypasses
      // storage RLS by design). Same fix pattern as business-logos
      // (#48 / #49).
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData,
      })
      const payload = await res.json().catch(() => ({} as { publicUrl?: string; error?: string }))
      if (!res.ok) {
        throw new Error(payload.error || `Upload failed (HTTP ${res.status})`)
      }
      // Cache-bust so a re-upload of the same path renders the new
      // image instead of the browser's cached previous version.
      const url = `${payload.publicUrl}?t=${Date.now()}`
      setForm(prev => ({ ...prev, avatar_url: url }))
      // Surface success so the user knows the form still needs to be
      // submitted to persist the new avatar_url to profiles.
      setMessage({ type: 'success', text: 'Photo uploaded. Click "Save changes" to apply.' })
    } catch (err: unknown) {
      const detail =
        err instanceof Error ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
              ? String((err as { message: unknown }).message)
              : 'unknown error'
      console.error('Avatar upload failed:', err)
      setMessage({ type: 'error', text: `Failed to upload photo — ${detail}` })
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
    if (form.phone && form.whatsapp && normalizePhone(form.phone) === normalizePhone(form.whatsapp)) {
      setMessage({ type: 'error', text: 'WhatsApp number is the same as your phone number. Leave WhatsApp blank if they are the same.' })
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/profile', {
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
        <div className="mb-8 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Profile completeness</span>
            <span className={`text-sm font-bold ${percentColor}`}>{percent}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
            <div className="h-2 rounded-full transition-all duration-300"
              style={{ width: `${percent}%`, backgroundColor: barColor }} />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Fill in the remaining fields to help the community connect with you:
          </p>
          <div className="flex flex-wrap gap-2">
            {missing.map(f => (
              <span key={f.key}
                className="inline-flex items-center gap-1 text-xs bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700 rounded-full px-3 py-1">
                + {f.label}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-8 flex items-center gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
          <span className="text-xl">✅</span>
          <div>
            <p className="text-sm font-semibold text-green-800 dark:text-green-300">Profile complete!</p>
            <p className="text-xs text-green-600 dark:text-green-400">Your profile is fully set up. Save to apply your changes.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ── Avatar ── */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative group">
            <UserAvatar
              src={form.avatar_url}
              name={`${form.first_name} ${form.last_name}`.trim()}
              size="xl"
              fallbackTone="strong"
              alt="Profile photo"
              className="border-4 border-white dark:border-gray-800 shadow-md"
              fallback={
                <div className="w-full h-full bg-green-600 flex items-center justify-center text-white text-2xl font-bold">
                  {initials}
                </div>
              }
            />
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
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {avatarUploading ? 'Uploading your photo…' : 'Click photo to upload · Max 2MB'}
          </p>
        </div>

        {/* ── Basic Info ── */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {isInstitution ? 'Account Holder' : 'Basic Information'}
          </h2>
          {isInstitution && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              The person managing this institutional account on AgroYield.
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
              <input type="text" value={form.first_name}
                onChange={e => setForm(prev => ({ ...prev, first_name: e.target.value }))}
                className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
              <input type="text" value={form.last_name}
                onChange={e => setForm(prev => ({ ...prev, last_name: e.target.value }))}
                className={inputCls} />
            </div>
          </div>
        </div>

        {/* ── Institution verification banner ── */}
        {isInstitution && (
          <div className={`flex items-start gap-3 rounded-xl p-4 border ${
            initialData.is_institution_verified
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
          }`}>
            <span className="text-xl">{initialData.is_institution_verified ? '✅' : '⏳'}</span>
            <div>
              <p className={`text-sm font-semibold ${
                initialData.is_institution_verified
                  ? 'text-green-800 dark:text-green-300'
                  : 'text-amber-800 dark:text-amber-300'
              }`}>
                {initialData.is_institution_verified ? 'Verified Institution' : 'Pending Verification'}
              </p>
              <p className={`text-xs ${
                initialData.is_institution_verified
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}>
                {initialData.is_institution_verified
                  ? 'Your institution is verified. You can post opportunities, grants, and listings.'
                  : 'Your institution is awaiting admin verification. You can browse the platform but cannot post until verified.'}
              </p>
            </div>
          </div>
        )}

        {/* ── Institution Details (institution accounts only) ── */}
        {isInstitution && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Institution Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Institution Name *</label>
                <input type="text" value={form.institution_display_name}
                  onChange={e => setForm(prev => ({ ...prev, institution_display_name: e.target.value }))}
                  placeholder="e.g. University of Ibadan, IITA, Federal Ministry of Agriculture"
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Institution Type *</label>
                <div className="grid grid-cols-2 gap-3">
                  {INSTITUTION_TYPES.map(t => (
                    <button key={t.value} type="button"
                      onClick={() => setForm(prev => ({ ...prev, institution_type: t.value }))}
                      className={`py-3 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${
                        form.institution_type === t.value
                          ? 'border-green-600 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-green-300 dark:hover:border-green-600'
                      }`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Person Name *</label>
                  <input type="text" value={form.contact_person_name}
                    onChange={e => setForm(prev => ({ ...prev, contact_person_name: e.target.value }))}
                    placeholder="e.g. Dr. Amina Bello"
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Person Title</label>
                  <input type="text" value={form.contact_person_role}
                    onChange={e => setForm(prev => ({ ...prev, contact_person_role: e.target.value }))}
                    placeholder="e.g. Head of Research Partnerships"
                    className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Website</label>
                  <input type="url" value={form.institution_website}
                    onChange={e => setForm(prev => ({ ...prev, institution_website: e.target.value }))}
                    placeholder="https://www.example.edu.ng"
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CAC Registration Number</label>
                  <input type="text" value={form.institution_cac}
                    onChange={e => setForm(prev => ({ ...prev, institution_cac: e.target.value }))}
                    placeholder="e.g. RC-1234567"
                    className={inputCls} />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Helps speed up verification</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Role (individual accounts only) ── */}
        {!isInstitution && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Your Role</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {ROLES.map(role => (
                <button key={role.value} type="button"
                  onClick={() => setForm(prev => ({ ...prev, role: role.value }))}
                  className={`py-3 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${
                    form.role === role.value
                      ? 'border-green-600 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-green-300 dark:hover:border-green-600'
                  }`}>
                  {role.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Personal (individual accounts only) ── */}
        {!isInstitution && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Personal Details</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gender</label>
                <select value={form.gender}
                  onChange={e => setForm(prev => ({ ...prev, gender: e.target.value }))}
                  className={inputCls}>
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date of Birth</label>
                <input type="date" value={form.date_of_birth}
                  onChange={e => setForm(prev => ({ ...prev, date_of_birth: e.target.value }))}
                  className={inputCls} />
              </div>
            </div>
          </div>
        )}

        {/* ── Bio ── */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {isInstitution ? 'About Your Institution' : 'About You'}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isInstitution ? 'Description' : 'Bio'}
              </label>
              <textarea value={form.bio} rows={4}
                onChange={e => setForm(prev => ({ ...prev, bio: e.target.value }))}
                placeholder={isInstitution
                  ? 'Describe your institution, its mission, and areas of focus...'
                  : 'Tell the community a bit about yourself...'}
                className={inputCls} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location (State / Country)</label>
                <input type="text" value={form.location}
                  onChange={e => setForm(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g. Lagos, Nigeria"
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Institution / Organisation</label>
                <input
                  type="text"
                  value={form.institution}
                  onChange={e => setForm(prev => ({ ...prev, institution: e.target.value }))}
                  placeholder="e.g. University of Ibadan"
                  list="institutions-list"
                  autoComplete="off"
                  className={inputCls}
                />
                <datalist id="institutions-list">
                  {INSTITUTIONS.map(inst => (
                    <option key={inst} value={inst} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Other Institution / Programme</label>
                <input
                  type="text"
                  value={form.institution_2}
                  onChange={e => setForm(prev => ({ ...prev, institution_2: e.target.value }))}
                  placeholder="e.g. Stanford LEAD Program"
                  list="institutions-list"
                  autoComplete="off"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Other Institution / Programme</label>
                <input
                  type="text"
                  value={form.institution_3}
                  onChange={e => setForm(prev => ({ ...prev, institution_3: e.target.value }))}
                  placeholder="e.g. Harvard Finance Specialization"
                  list="institutions-list"
                  autoComplete="off"
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Interests ── */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Areas of Interest</h2>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map(interest => (
              <button key={interest} type="button" onClick={() => toggleInterest(interest)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  form.interests.includes(interest)
                    ? 'bg-green-600 text-white border-green-600'
                    : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-green-400 dark:hover:border-green-500'
                }`}>
                {interest}
              </button>
            ))}
          </div>
        </div>

        {/* ── Contact Details ── */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Contact Details <span className="text-sm font-normal text-gray-400 dark:text-gray-500">(Optional)</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Only visible to logged-in members — not shown to guests.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
              <input type="tel" inputMode="tel" value={form.phone}
                onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+234 800 000 0000"
                className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">WhatsApp Number</label>
              <input type="tel" inputMode="tel" value={form.whatsapp}
                onChange={e => setForm(prev => ({ ...prev, whatsapp: e.target.value }))}
                placeholder="+234 800 000 0000"
                className={inputCls} />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Leave blank if same as phone number</p>
            </div>
          </div>
        </div>

        {/* ── Links ── */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Links <span className="text-sm font-normal text-gray-400 dark:text-gray-500">(Optional)</span>
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">LinkedIn URL</label>
              <input type="url" value={form.linkedin}
                onChange={e => setForm(prev => ({ ...prev, linkedin: e.target.value }))}
                placeholder="https://linkedin.com/in/yourname"
                className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Twitter / X URL</label>
              <input type="url" value={form.twitter}
                onChange={e => setForm(prev => ({ ...prev, twitter: e.target.value }))}
                placeholder="https://x.com/yourhandle"
                className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Facebook URL</label>
              <input type="url" value={form.facebook}
                onChange={e => setForm(prev => ({ ...prev, facebook: e.target.value }))}
                placeholder="https://facebook.com/yourname"
                className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">TikTok URL</label>
              <input type="url" value={form.tiktok}
                onChange={e => setForm(prev => ({ ...prev, tiktok: e.target.value }))}
                placeholder="https://tiktok.com/@yourhandle"
                className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Website</label>
              <input type="url" value={form.website}
                onChange={e => setForm(prev => ({ ...prev, website: e.target.value }))}
                placeholder="https://yourwebsite.com"
                className={inputCls} />
            </div>
          </div>
        </div>

        {/* ── Open to Opportunities ── */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Discoverability
          </h2>
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.open_to_opportunities}
              onChange={e => setForm(prev => ({
                ...prev,
                open_to_opportunities: e.target.checked,
                // Clear expiry when toggling off so we don't keep stale dates.
                open_to_opportunities_until: e.target.checked ? prev.open_to_opportunities_until : '',
              }))}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span className="text-sm">
              <span className="block font-medium text-gray-900 dark:text-gray-100">
                I&apos;m open to opportunities
              </span>
              <span className="block text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                Adds an <strong className="font-semibold text-green-700 dark:text-green-400">OPEN</strong> badge to your profile and surfaces you in the <em>Open to Opportunities</em> filter on the directory. Ideal for agripreneurs seeking partnerships, researchers open to collaborations, or job seekers.
              </span>
            </span>
          </label>
          {form.open_to_opportunities && (
            <div className="mt-4 ml-7">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Show until <span className="text-gray-400 dark:text-gray-500 font-normal">(Optional)</span>
              </label>
              <input
                type="date"
                value={form.open_to_opportunities_until}
                onChange={e => setForm(prev => ({ ...prev, open_to_opportunities_until: e.target.value }))}
                className={`${inputCls} sm:max-w-xs`}
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                The badge will hide after this date. Leave blank to keep it on indefinitely.
              </p>
            </div>
          )}
        </div>

        {/* ── Security & Notifications ── */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Security & Notifications
          </h2>
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.notify_on_login}
              onChange={e => setForm(prev => ({ ...prev, notify_on_login: e.target.checked }))}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span className="text-sm">
              <span className="block font-medium text-gray-900 dark:text-gray-100">
                Email me when a new device signs in to my account
              </span>
              <span className="block text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                We&apos;ll only notify you if we don&apos;t recognise the device or network. Recommended.
              </span>
            </span>
          </label>
        </div>

        {/* ── Submit ── */}
        {message && (
          <div className={`rounded-lg px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
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
