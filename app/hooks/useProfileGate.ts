'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Hook that checks whether the current user has completed the required
 * profile fields (first_name, last_name, and at least one contact method).
 *
 * Returns:
 *  - `ready`:    true once the check has finished
 *  - `allowed`:  true if all required fields are filled
 *  - `missing`:  list of human-readable missing field names (for display)
 */
export default function useProfileGate() {
  const [ready, setReady]     = useState(false)
  const [allowed, setAllowed] = useState(false)
  const [missing, setMissing] = useState<string[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setReady(true); return }

      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('first_name, last_name, phone, whatsapp')
        .eq('id', user.id)
        .single()

      const gaps: string[] = []
      if (!profile?.first_name?.trim()) gaps.push('First name')
      if (!profile?.last_name?.trim())  gaps.push('Last name')
      if (!profile?.phone?.trim() && !profile?.whatsapp?.trim()) gaps.push('Phone or WhatsApp number')

      setMissing(gaps)
      setAllowed(gaps.length === 0)
      setReady(true)
    })
  }, [])

  return { ready, allowed, missing }
}
