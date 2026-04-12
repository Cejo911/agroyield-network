'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const ROLES = [
  { value: 'student',     label: 'Student',     icon: '🎓', desc: 'Learning about agriculture' },
  { value: 'researcher',  label: 'Researcher',  icon: '🔬', desc: 'Conducting agricultural research' },
  { value: 'farmer',      label: 'Farmer',      icon: '🌾', desc: 'Growing crops or raising livestock' },
  { value: 'agripreneur', label: 'Agripreneur', icon: '💼', desc: 'Running an agribusiness' },
]

const MODULES = [
  { key: 'directory',     label: 'Directory',      icon: '👥', desc: 'Connect with the community' },
  { key: 'opportunities', label: 'Opportunities',   icon: '🌱', desc: 'Grants, jobs & fellowships' },
  { key: 'prices',        label: 'Price Tracker',   icon: '📊', desc: 'Commodity prices across Nigeria' },
  { key: 'marketplace',   label: 'Marketplace',     icon: '🛒', desc: 'Buy & sell agri products' },
  { key: 'research',      label: 'Research Board',  icon: '🔬', desc: 'Share & discover research' },
  { key: 'business',      label: 'Business Suite',  icon: '💼', desc: 'Invoices, inventory & reports' },
]

interface Props {
  userId: string
  firstName: string
  lastName: string
  email: string
}

export default function OnboardingWizard({ userId, firstName, lastName, email }: Props) {
  const [step, setStep] = useState(1)
  const [role, setRole] = useState('')
  const [selectedModules, setSelectedModules] = useState<string[]>([])
  const [name, setName] = useState({ first: firstName || '', last: lastName || '' })
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const toggleModule = (key: string) => {
    setSelectedModules(prev =>
      prev.includes(key) ? prev.filter(m => m !== key) : [...prev, key]
    )
  }

  const handleFinish = async () => {
    setSaving(true)
    // Update profile with onboarding data
    await supabase.from('profiles').update({
      first_name: name.first || firstName,
      last_name: name.last || lastName,
      role: role || null,
      has_onboarded: true,
    }).eq('id', userId)
    setSaving(false)

    // Navigate to the first selected module, or dashboard
    if (selectedModules.length > 0) {
      const firstModule = selectedModules[0]
      router.push(`/${firstModule}`)
    } else {
      router.refresh()
    }
  }

  const handleSkip = async () => {
    await supabase.from('profiles').update({ has_onboarded: true }).eq('id', userId)
    router.refresh()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Progress bar */}
        <div className="flex gap-1.5 px-6 pt-6">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>

        <div className="px-6 pt-5 pb-6">

          {/* ── Step 1: Who are you? ───────────────────────── */}
          {step === 1 && (
            <>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                Welcome to AgroYield! 🌱
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Let's get you set up. First, tell us about yourself.
              </p>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">First name</label>
                  <input
                    type="text"
                    value={name.first}
                    onChange={e => setName(n => ({ ...n, first: e.target.value }))}
                    placeholder="Chidi"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Last name</label>
                  <input
                    type="text"
                    value={name.last}
                    onChange={e => setName(n => ({ ...n, last: e.target.value }))}
                    placeholder="Okonkwo"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">I am a...</label>
              <div className="grid grid-cols-2 gap-2.5 mb-6">
                {ROLES.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`text-left p-3.5 rounded-xl border-2 transition-all ${
                      role === r.value
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <span className="text-xl">{r.icon}</span>
                    <p className={`text-sm font-semibold mt-1.5 ${role === r.value ? 'text-green-700 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                      {r.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{r.desc}</p>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={handleSkip} className="flex-1 py-2.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                  Skip for now
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!name.first}
                  className="flex-1 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </>
          )}

          {/* ── Step 2: What interests you? ────────────────── */}
          {step === 2 && (
            <>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                What would you like to explore?
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Pick the modules that interest you. You can always change this later.
              </p>

              <div className="grid grid-cols-2 gap-2.5 mb-6">
                {MODULES.map(m => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => toggleModule(m.key)}
                    className={`text-left p-3.5 rounded-xl border-2 transition-all ${
                      selectedModules.includes(m.key)
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <span className="text-xl">{m.icon}</span>
                    <p className={`text-sm font-semibold mt-1.5 ${selectedModules.includes(m.key) ? 'text-green-700 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                      {m.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{m.desc}</p>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 py-2.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors"
                >
                  Next
                </button>
              </div>
            </>
          )}

          {/* ── Step 3: Get started ────────────────────────── */}
          {step === 3 && (
            <>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                You're all set! 🎉
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Here's what you can do next to get the most out of AgroYield.
              </p>

              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700">
                  <span className="text-xl mt-0.5">👤</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Complete your full profile</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Add your bio, institution, interests, and links so others can find and connect with you.</p>
                  </div>
                </div>
                {role === 'agripreneur' && (
                  <div className="flex items-start gap-3 p-3.5 rounded-xl border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
                    <span className="text-xl mt-0.5">💼</span>
                    <div>
                      <p className="text-sm font-semibold text-green-700 dark:text-green-400">Set up your business</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Create invoices, manage inventory, and track your revenue with the Business Suite.</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700">
                  <span className="text-xl mt-0.5">👥</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Explore the directory</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Find students, researchers, farmers, and agripreneurs to connect with.</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 py-2.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                  Back
                </button>
                <button
                  onClick={handleFinish}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : "Let's go! →"}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}