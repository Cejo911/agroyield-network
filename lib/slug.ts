/**
 * Slug utilities for public business URLs (/b/{slug}).
 *
 * Keep this in lockstep with `supabase/migrations/20260417_business_slugs.sql`:
 * the DB trigger is the source of truth on INSERT, but client code and the
 * admin rename API use these helpers for UX validation and uniqueness checks.
 */

import { createClient as createAdminClient } from '@supabase/supabase-js'

/**
 * Reserved slugs — mirrors `public.reserved_slugs` for client-side UX.
 * The DB has a full copy (including all Nigerian-gov entries). This subset
 * covers the most common routing/brand collisions so the client can warn
 * BEFORE the API call. The admin API still re-checks against the DB table.
 */
export const RESERVED_SLUGS = new Set<string>([
  // App routing
  'admin', 'api', 'dashboard', 'app', 'b', 'u', 'www', 'mail', 'new',
  'login', 'signup', 'settings', 'about', 'contact', 'privacy', 'terms',
  'pricing', 'support', 'help', 'edit', 'test', 'null', 'undefined',
  // Brand
  'agroyield',
  // Nigerian government (umbrella + key agencies)
  'federal', 'national', 'nigeria', 'nigerian', 'government', 'fgn', 'state',
  'ministry', 'presidential', 'president', 'senate', 'assembly', 'governor', 'minister',
  'cac', 'cbn', 'nafdac', 'son', 'frsc', 'efcc', 'icpc', 'nimc', 'firs',
  'ncc', 'nitda', 'inec', 'ndlea', 'nysc', 'sec', 'nerc', 'nnpc', 'nddc',
  'dss', 'nda',
  // Defence
  'army', 'navy', 'police', 'military', 'air-force',
  // CAC-restricted
  'royal', 'imperial', 'kingdom', 'church', 'mosque',
  // Regulated sectors
  'bank', 'insurance', 'trust', 'broker',
  'university', 'college', 'academy', 'hospital', 'clinic',
])

/** Max slug length (matches DB backfill + trigger). */
export const SLUG_MAX_LENGTH = 40

/**
 * Convert any string into a URL-safe slug.
 * Mirrors the DB expression:
 *   lower(input) → replace non-alnum with '-' → trim leading/trailing '-' → truncate 40
 */
export function slugify(input: string): string {
  if (!input) return ''
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, '') // re-trim trailing '-' after slice
}

/** True if slug is non-empty, matches `^[a-z0-9][a-z0-9-]*[a-z0-9]$`, within length. */
export function isValidSlugFormat(slug: string): boolean {
  if (!slug) return false
  if (slug.length < 2 || slug.length > SLUG_MAX_LENGTH) return false
  return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug)
}

/** Check the client-side reserved set. Admin API re-verifies against DB. */
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug)
}

/**
 * Server-side: generate a unique slug for a business.
 * Uses service-role admin client (bypasses RLS — caller MUST verify admin).
 *
 * Strategy:
 *   1. slugify(name) → base
 *   2. If empty, use 'business'
 *   3. If reserved, append '-biz'
 *   4. Sequential suffix (-2, -3, ...) until unique across BOTH businesses.slug
 *      AND business_slug_aliases.old_slug (aliases block new slugs to prevent
 *      collision with 301-redirected historical URLs).
 */
export async function generateUniqueBusinessSlug(name: string): Promise<string> {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  let base = slugify(name) || 'business'
  if (isReservedSlug(base)) base = `${base}-biz`
  // Also check DB reserved_slugs (in case client set is out of date)
  const { data: reservedHit } = await adminAny
    .from('reserved_slugs').select('slug').eq('slug', base).maybeSingle()
  if (reservedHit) base = `${base}-biz`

  let candidate = base
  let n = 2
  for (;;) {
    const [{ data: live }, { data: alias }] = await Promise.all([
      adminAny.from('businesses').select('id').eq('slug', candidate).maybeSingle(),
      adminAny.from('business_slug_aliases').select('id').eq('old_slug', candidate).maybeSingle(),
    ])
    if (!live && !alias) return candidate
    candidate = `${base}-${n}`
    n += 1
    if (n > 1000) throw new Error('Could not generate unique slug after 1000 attempts')
  }
}

/**
 * Server-side: check availability of a specific slug (for the admin rename form).
 * Returns { available, reason } so the UI can render an inline error.
 */
export async function checkSlugAvailability(
  slug: string,
  currentBusinessId?: string,
): Promise<{ available: boolean; reason?: string }> {
  if (!isValidSlugFormat(slug)) {
    return { available: false, reason: 'Use lowercase letters, numbers, and hyphens (2–40 chars).' }
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  const { data: reservedHit } = await adminAny
    .from('reserved_slugs').select('slug, category').eq('slug', slug).maybeSingle()
  if (reservedHit) {
    return { available: false, reason: `Reserved (${reservedHit.category || 'system'}).` }
  }

  const { data: live } = await adminAny
    .from('businesses').select('id').eq('slug', slug).maybeSingle()
  if (live && live.id !== currentBusinessId) {
    return { available: false, reason: 'Already taken by another business.' }
  }

  const { data: alias } = await adminAny
    .from('business_slug_aliases').select('business_id').eq('old_slug', slug).maybeSingle()
  // An alias for the SAME business means we're reverting to an old slug — allow it.
  if (alias && alias.business_id !== currentBusinessId) {
    return { available: false, reason: 'Was historically used by another business.' }
  }

  return { available: true }
}
