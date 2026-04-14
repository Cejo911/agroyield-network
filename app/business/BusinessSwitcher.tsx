'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getAllBusinessAccess, type BusinessAccess } from '@/lib/business-access'
import { getActiveBusinessId, setActiveBusinessId } from '@/lib/business-cookie'

/**
 * Business switcher dropdown. Shows the active business name and lets
 * the user switch between businesses they own or belong to as a team member.
 *
 * If the user has only one business the dropdown is hidden — just shows the name.
 * If multi-business is off in settings and the user has one business, same effect.
 */
export default function BusinessSwitcher() {
  const supabase = createClient()
  const router = useRouter()
  const [businesses, setBusinesses] = useState<BusinessAccess[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [multiEnabled, setMultiEnabled] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const all = await getAllBusinessAccess(supabase, user.id)
      setBusinesses(all)

      // Check if multi-business is enabled
      const { data: flag } = await supabase.from('settings').select('value').eq('key', 'allow_multi_business').single()
      if (flag?.value === 'true') setMultiEnabled(true)

      // Resolve active: cookie → first in list
      const cookieId = getActiveBusinessId()
      const valid = all.find(b => b.businessId === cookieId)
      const active = valid ? cookieId! : all[0]?.businessId ?? null
      setActiveId(active)

      // Sync cookie if it was stale or unset
      if (active && active !== cookieId) {
        setActiveBusinessId(active)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSwitch(id: string) {
    setActiveBusinessId(id)
    setActiveId(id)
    setOpen(false)
    // Hard refresh so all server + client pages re-read the cookie
    router.refresh()
  }

  // Nothing loaded yet or no businesses
  if (businesses.length === 0) return null

  const activeBiz = businesses.find(b => b.businessId === activeId) ?? businesses[0]

  // Single business — just show name, no dropdown
  if (businesses.length === 1) {
    return (
      <div className="px-3 py-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Business</p>
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate" title={activeBiz.businessName}>
          {activeBiz.businessName || 'My Business'}
        </p>
        <p className="text-[10px] text-gray-400 capitalize">{activeBiz.role}</p>
        {multiEnabled && (
          <button
            onClick={() => router.push('/business/setup?new=true')}
            className="mt-1 text-xs text-green-600 dark:text-green-400 hover:underline"
          >
            + New Business
          </button>
        )}
      </div>
    )
  }

  // Multiple businesses — show switcher dropdown
  return (
    <div className="px-3 py-2 relative">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Business</p>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-1 text-left"
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
            {activeBiz.businessName || 'My Business'}
          </p>
          <p className="text-[10px] text-gray-400 capitalize">{activeBiz.role}</p>
        </div>
        <svg className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-2 right-2 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
          {businesses.map(b => (
            <button
              key={b.businessId}
              onClick={() => handleSwitch(b.businessId)}
              className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-green-50 dark:hover:bg-green-900/20 ${
                b.businessId === activeId
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-medium'
                  : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              <p className="truncate">{b.businessName || 'Unnamed'}</p>
              <p className="text-[10px] text-gray-400 capitalize">{b.role}</p>
            </button>
          ))}
          {multiEnabled && (
            <button
              onClick={() => { setOpen(false); router.push('/business/setup?new=true') }}
              className="w-full text-left px-3 py-2 text-sm text-green-600 dark:text-green-400 font-medium border-t border-gray-100 dark:border-gray-800 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
            >
              + New Business
            </button>
          )}
        </div>
      )}
    </div>
  )
}
