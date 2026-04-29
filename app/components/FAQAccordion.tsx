'use client'

import { useState } from 'react'
import type { FAQItem } from '@/lib/faq-data'

interface FAQAccordionProps {
  items: FAQItem[]
  /** Optional title above the accordion (hidden if empty) */
  title?: string
  /** Optional subtitle/description */
  subtitle?: string
  /** Whether to show a compact version (for inline embeds) vs full (for /faq page) */
  compact?: boolean
}

export default function FAQAccordion({ items, title, subtitle, compact = false }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  if (!items || items.length === 0) return null

  return (
    <section className={compact ? 'mt-12 mb-8' : ''}>
      {/* Header */}
      {(title || subtitle) && (
        <div className={compact ? 'mb-6' : 'mb-8'}>
          {title && (
            <h2 className={`font-bold text-gray-900 dark:text-white ${compact ? 'text-lg' : 'text-2xl'}`}>
              {title}
            </h2>
          )}
          {subtitle && (
            <p className={`text-gray-500 dark:text-gray-400 mt-1 ${compact ? 'text-sm' : 'text-base'}`}>
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Accordion items */}
      <div className={`divide-y divide-gray-200 dark:divide-gray-700/50 border border-gray-200 dark:border-gray-700/50 rounded-xl overflow-hidden ${compact ? '' : 'shadow-sm'}`}>
        {items.map((item, i) => {
          const isOpen = openIndex === i
          return (
            <div key={i} className="bg-white dark:bg-gray-900/50">
              <button
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                aria-expanded={isOpen}
              >
                <span className={`font-medium text-gray-900 dark:text-white pr-4 ${compact ? 'text-sm' : 'text-[15px]'}`}>
                  {item.q}
                </span>
                <svg
                  aria-hidden="true"
                  className={`w-5 h-5 text-gray-500 dark:text-gray-500 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Answer panel with smooth height transition */}
              <div
                className={`overflow-hidden transition-all duration-200 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
              >
                <div className={`px-5 pb-4 text-gray-600 dark:text-gray-300 leading-relaxed ${compact ? 'text-sm' : 'text-[15px]'}`}>
                  {item.a}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
