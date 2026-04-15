'use client'

import { useState } from 'react'

type FormState = {
  name: string; address: string; phone: string; alt_phone: string; whatsapp: string; email: string
  cac_number: string; vat_tin: string
  bank_name: string; account_name: string; account_number: string
  invoice_prefix: string; logo_url: string
}

type Step = {
  id: string
  label: string
  tip: string
  check: (f: FormState) => boolean
}

const STEPS: Step[] = [
  {
    id: 'logo',
    label: 'Upload Logo',
    tip: 'Your logo appears on invoices and receipts — it builds brand recognition with customers.',
    check: (f) => !!f.logo_url,
  },
  {
    id: 'details',
    label: 'Business Details',
    tip: 'Name, address and phone are required. Add WhatsApp so customers can reach you instantly.',
    check: (f) => !!f.name && !!f.address && !!f.phone,
  },
  {
    id: 'registration',
    label: 'Registration & Tax',
    tip: 'Adding your CAC number and TIN builds trust and credibility on your invoices.',
    check: (f) => !!f.cac_number || !!f.vat_tin,
  },
  {
    id: 'bank',
    label: 'Bank Details',
    tip: 'Customers will see your bank details on invoices — so they know exactly where to pay.',
    check: (f) => !!f.bank_name && !!f.account_name && !!f.account_number,
  },
  {
    id: 'invoice',
    label: 'Invoice Settings',
    tip: 'Set a custom prefix (e.g. your initials) to make invoices uniquely yours.',
    check: (f) => !!f.invoice_prefix,
  },
]

export default function BusinessSetupGuide({ form }: { form: FormState }) {
  const [open, setOpen] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const completed = STEPS.filter(s => s.check(form)).length
  const total = STEPS.length
  const allDone = completed === total
  const pct = Math.round((completed / total) * 100)

  // Find the first incomplete step to highlight
  const currentStep = STEPS.find(s => !s.check(form))

  return (
    <div className="fixed bottom-6 right-6 z-50" style={{ maxWidth: '340px' }}>
      {/* Collapsed: floating badge */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg rounded-full px-4 py-2.5 hover:shadow-xl transition-all group"
        >
          <div className="relative w-9 h-9 shrink-0">
            <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" className="text-gray-200 dark:text-gray-700" strokeWidth="3" />
              <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" className="text-green-500" strokeWidth="3"
                strokeDasharray={`${pct * 0.9425} 94.25`} strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-green-600 dark:text-green-400">
              {completed}/{total}
            </span>
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
            Setup Guide
          </span>
        </button>
      )}

      {/* Expanded: full checklist panel */}
      {open && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-bold text-sm">Business Setup Guide</h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setOpen(false)}
                  className="text-white/70 hover:text-white text-xs px-1.5 py-0.5 rounded transition-colors"
                  title="Minimise"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
                <button
                  onClick={() => setDismissed(true)}
                  className="text-white/70 hover:text-white text-xs px-1.5 py-0.5 rounded transition-colors"
                  title="Dismiss"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
            {/* Progress bar */}
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-white/20 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-white h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-white text-xs font-semibold shrink-0">{pct}%</span>
            </div>
          </div>

          {/* Steps */}
          <div className="px-4 py-3 space-y-1 max-h-[340px] overflow-y-auto">
            {allDone ? (
              <div className="text-center py-4">
                <p className="text-2xl mb-2">🎉</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">All done!</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Your business profile is complete. Your invoices will look professional and trustworthy.
                </p>
                <button
                  onClick={() => setDismissed(true)}
                  className="mt-3 text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium"
                >
                  Dismiss guide
                </button>
              </div>
            ) : (
              STEPS.map(step => {
                const done = step.check(form)
                const isCurrent = step.id === currentStep?.id
                return (
                  <div
                    key={step.id}
                    className={`flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      isCurrent
                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                        : done
                          ? 'opacity-60'
                          : ''
                    }`}
                  >
                    {/* Checkbox circle */}
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      done
                        ? 'bg-green-500 text-white'
                        : isCurrent
                          ? 'border-2 border-green-500 bg-white dark:bg-gray-900'
                          : 'border-2 border-gray-300 dark:border-gray-600'
                    }`}>
                      {done && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${
                        done
                          ? 'text-gray-400 dark:text-gray-500 line-through'
                          : 'text-gray-800 dark:text-gray-200'
                      }`}>
                        {step.label}
                      </p>
                      {isCurrent && (
                        <p className="text-xs text-green-700 dark:text-green-400 mt-0.5 leading-relaxed">
                          {step.tip}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer hint */}
          {!allDone && (
            <div className="px-5 py-2.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
              <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center">
                Complete all steps for professional invoices ✨
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
