// Profile-experience read helpers.
//
// Centralised so /profile, /directory/[id], and /u/[slug] share one contract:
// identical column shape, identical ordering (current first, then newest start
// date first). If we later decide to merge rows (e.g. promote/restructure at
// the same org), we change it in one place instead of three.
//
// Write paths live in `/app/api/profile/experience/route.ts`. RLS is permissive
// for SELECT (experience is part of a public profile page), so a plain
// authenticated client is fine — no admin client needed for reads.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

export type ExperienceRow = {
  id:           string
  profile_id:   string
  role:         string
  organisation: string
  start_date:   string          // ISO date (YYYY-MM-DD)
  end_date:     string | null
  is_current:   boolean
  description:  string | null
  created_at:   string
  updated_at:   string
}

/**
 * Fetch all experience rows for a profile.
 *
 * Ordering: current roles first (is_current DESC), then newest start first.
 * Matches how a reader would expect to see a LinkedIn-style history.
 */
export async function getProfileExperience(
  supabase: SupabaseClient,
  profileId: string
): Promise<ExperienceRow[]> {
  if (!profileId) return []
  const { data, error } = await supabase
    .from('profile_experience')
    .select('id, profile_id, role, organisation, start_date, end_date, is_current, description, created_at, updated_at')
    .eq('profile_id', profileId)
    .order('is_current',  { ascending: false })
    .order('start_date',  { ascending: false })

  if (error) {
    console.error('[profile-experience] fetch failed', error)
    return []
  }
  return (data ?? []) as ExperienceRow[]
}

/**
 * Format a date range for display.
 * Examples:
 *   ("2023-02-01", null, true)    → "Feb 2023 – Present"
 *   ("2019-06-01", "2022-08-01")  → "Jun 2019 – Aug 2022 · 3 yrs 2 mos"
 *   ("2024-01-01", "2024-04-01")  → "Jan 2024 – Apr 2024 · 3 mos"
 */
export function formatRange(row: Pick<ExperienceRow, 'start_date' | 'end_date' | 'is_current'>): string {
  const fmt = (iso: string): string => {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
  }

  const start   = fmt(row.start_date)
  const endStr  = row.is_current || !row.end_date ? 'Present' : fmt(row.end_date)

  // Duration — months between start and end (or now)
  const startTs = new Date(row.start_date).getTime()
  const endTs   = row.is_current || !row.end_date ? Date.now() : new Date(row.end_date).getTime()
  if (isNaN(startTs) || isNaN(endTs) || endTs < startTs) return `${start} – ${endStr}`

  const months = Math.max(1, Math.round((endTs - startTs) / (1000 * 60 * 60 * 24 * 30.4375)))
  const yrs    = Math.floor(months / 12)
  const mos    = months % 12
  const parts: string[] = []
  if (yrs > 0) parts.push(`${yrs} yr${yrs === 1 ? '' : 's'}`)
  if (mos > 0) parts.push(`${mos} mo${mos === 1 ? '' : 's'}`)
  const duration = parts.length > 0 ? parts.join(' ') : '<1 mo'

  return `${start} – ${endStr} · ${duration}`
}
