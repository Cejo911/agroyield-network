'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

/**
 * Hook that checks whether the current user has completed the required
 * profile fields (first_name, last_name, and at least one contact method).
 *
 * Returns:
 *  - `ready`:    true once the check has finished
 *  - `allowed`:  true if all required fields are filled
 *  - `missing`:  list of human-readable missing field names (for display)
 *  - `isInstitution`:           true if account_type === 'institution'
 *  - `isInstitutionVerified`:   true if the institution has been admin-verified
 */
export default function useProfileGate() {
  const [ready, setReady]     = useState(false)
  const [allowed, setAllowed] = useState(false)
  const [missing, setMissing] = useState<string[]>([])
  const [isInstitution, setIsInstitution] = useState(false)
  const [isInstitutionVerified, setIsInstitutionVerified] = useState(false)

  useEffect(() => {
    const supabase = createClient() as SupabaseClient<Database>
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setReady(true); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone, whatsapp, account_type, is_institution_verified')
        .eq('id', user.id)
        .single()

      const gaps: string[] = []
      if (!profile?.first_name?.trim()) gaps.push('First name')
      if (!profile?.last_name?.trim())  gaps.push('Last name')
      if (!profile?.phone?.trim() && !profile?.whatsapp?.trim()) gaps.push('Phone or WhatsApp number')

      setMissing(gaps)
      setAllowed(gaps.length === 0)
      setIsInstitution(profile?.account_type === 'institution')
      setIsInstitutionVerified(!!profile?.is_institution_verified)
      setReady(true)
    })
  }, [])

  return { ready, allowed, missing, isInstitution, isInstitutionVerified }
}
