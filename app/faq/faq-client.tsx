'use client'

import { useState } from 'react'
import { MODULE_META, MODULE_FAQS, getAllModuleKeys } from '@/lib/faq-data'
import type { ModuleKey } from '@/lib/faq-data'
import FAQAccordion from '@/app/components/FAQAccordion'

export default function FAQClient() {
  const modules = getAllModuleKeys()
  const [activeModule, setActiveModule] = useState<ModuleKey>('dashboard')

  const meta = MODULE_META[activeModule]
  const faqs = MODULE_FAQS[activeModule]

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Frequently Asked Questions
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-lg">
          Everything you need to know about AgroYield Network
        </p>
      </div>

      {/* Module tabs — horizontally scrollable */}
      <div className="mb-8 -mx-4 px-4 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 min-w-max pb-2">
          {modules.map((key) => {
            const m = MODULE_META[key]
            const isActive = key === activeModule
            return (
              <button
                key={key}
                onClick={() => setActiveModule(key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <span>{m.icon}</span>
                <span>{m.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Active module description */}
      <div className="flex items-center gap-3 mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800/30">
        <span className="text-2xl">{meta.icon}</span>
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">{meta.label}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{meta.description}</p>
        </div>
      </div>

      {/* FAQ accordion for active module */}
      <FAQAccordion items={faqs} />

      {/* Help footer */}
      <div className="mt-12 text-center py-8 border-t border-gray-200 dark:border-gray-700/50">
        <p className="text-gray-500 dark:text-gray-400 mb-2">
          Still have questions?
        </p>
        <a
          href="mailto:hello@agroyield.africa"
          className="inline-flex items-center gap-2 text-green-600 dark:text-green-400 font-medium hover:underline"
        >
          <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          hello@agroyield.africa
        </a>
      </div>
    </div>
  )
}
