/**
 * Institution posting gate — server-side enforcement.
 *
 * Institutions ("🏛" account_type) must be admin-verified before they can
 * post opportunities, grants, research, or marketplace listings. The UI
 * already hides the create buttons for unverified institutions, but a
 * direct POST would bypass client-side checks — so every content-creation
 * API route should call this helper after authentication.
 *
 * Individual (non-institution) users always pass. Unauthenticated calls are
 * the caller's responsibility — check `user` first.
 *
 * Returns `null` on allow, or a `NextResponse` (403) on deny which the
 * caller should return immediately.
 */
import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface GateResult {
  /** If non-null, the caller should `return` this response immediately. */
  block: NextResponse | null
  /** True if the user is an unverified institution (for logging/telemetry). */
  isUnverifiedInstitution: boolean
  /** True if the user is an institution (verified or not). */
  isInstitution: boolean
}

export async function requireVerifiedInstitution(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, 'public', any>,
  userId: string
): Promise<GateResult> {
  const { data: profile } = await (supabase as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (col: string, val: string) => {
          single: () => Promise<{ data: Record<string, unknown> | null }>
        }
      }
    }
  })
    .from('profiles')
    .select('account_type, is_institution_verified, institution_display_name')
    .eq('id', userId)
    .single()

  const accountType = profile?.account_type as string | undefined
  const isInstitution = accountType === 'institution'
  const isVerified = !!profile?.is_institution_verified

  if (isInstitution && !isVerified) {
    return {
      isInstitution: true,
      isUnverifiedInstitution: true,
      block: NextResponse.json(
        {
          error:
            'Your institution account is pending admin verification. ' +
            'Posting will unlock once our team approves your profile. ' +
            'We will email you the moment it is ready.',
          code: 'INSTITUTION_NOT_VERIFIED',
        },
        { status: 403 }
      ),
    }
  }

  return {
    isInstitution,
    isUnverifiedInstitution: false,
    block: null,
  }
}
