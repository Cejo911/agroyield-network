/**
 * Open to Opportunities — single source of truth for "is this profile
 * accepting opportunities RIGHT NOW?"
 *
 * The stored state is two columns:
 *   open_to_opportunities        boolean
 *   open_to_opportunities_until  timestamptz | null
 *
 * A true flag with a past expiry is effectively off. Both the /directory
 * filter pill and every profile-header OPEN badge call this helper so they
 * are guaranteed to agree — ruling out a class of "badge says open, filter
 * hides them" bugs.
 */
export function isOpenNow(profile: {
  open_to_opportunities?: boolean | null
  open_to_opportunities_until?: string | null
}): boolean {
  if (!profile.open_to_opportunities) return false
  if (!profile.open_to_opportunities_until) return true
  return new Date(profile.open_to_opportunities_until) >= new Date()
}
