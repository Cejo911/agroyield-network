import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sanitiseText, sanitiseUrl } from '@/lib/sanitise'

function generateSlug(firstName: string, lastName: string): string {
  return `${firstName}-${lastName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    // ── Institution submissions: enforce required identity fields ────────
    // The client form already validates, but a direct POST could bypass it.
    const submittedAccountType = body.account_type || 'individual'
    if (submittedAccountType === 'institution') {
      const ALLOWED_INSTITUTION_TYPES = ['university', 'government', 'ngo', 'agri_company']
      const missing: string[] = []
      if (!body.institution_display_name?.trim()) missing.push('institution_display_name')
      if (!body.institution_type?.trim())         missing.push('institution_type')
      if (!body.first_name?.trim())               missing.push('first_name (contact person)')
      if (!body.last_name?.trim())                missing.push('last_name (contact person)')
      if (missing.length > 0) {
        return NextResponse.json(
          { error: 'Missing required institution fields', missing },
          { status: 400 }
        )
      }
      if (!ALLOWED_INSTITUTION_TYPES.includes(body.institution_type)) {
        return NextResponse.json(
          { error: `Invalid institution_type. Must be one of: ${ALLOWED_INSTITUTION_TYPES.join(', ')}` },
          { status: 400 }
        )
      }
    }

    const { data: existing } = await supabaseAny
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single()

    let username: string | null = existing?.username ?? null

    if (!username && body.first_name && body.last_name) {
      const baseSlug = generateSlug(body.first_name, body.last_name)
      let candidate = baseSlug
      let counter = 2
      while (true) {
        const { data: taken } = await supabaseAny
          .from('profiles')
          .select('id')
          .eq('username', candidate)
          .maybeSingle()
        if (!taken) break
        candidate = `${baseSlug}-${counter}`
        counter++
      }
      username = candidate
    }

    const profileData = {
      id: user.id,
      first_name:    sanitiseText(body.first_name),
      last_name:     sanitiseText(body.last_name),
      role:          sanitiseText(body.role),
      bio:           sanitiseText(body.bio),
      location:      sanitiseText(body.location),
      institution:   sanitiseText(body.institution),
      institution_2: sanitiseText(body.institution_2),
      institution_3: sanitiseText(body.institution_3),
      interests:     body.interests?.length ? body.interests.map((i: string) => sanitiseText(i)).filter(Boolean) : null,
      linkedin:      sanitiseUrl(body.linkedin),
      twitter:       sanitiseUrl(body.twitter),
      facebook:      sanitiseUrl(body.facebook),
      tiktok:        sanitiseUrl(body.tiktok),
      website:       sanitiseUrl(body.website),
      avatar_url:    body.avatar_url    || null,
      phone:         sanitiseText(body.phone),
      whatsapp:      sanitiseText(body.whatsapp),
      gender:        body.gender        || null,
      date_of_birth: body.date_of_birth || null,
      notify_on_login: typeof body.notify_on_login === 'boolean' ? body.notify_on_login : true,
      updated_at:    new Date().toISOString(),
      ...(username ? { username } : {}),
      // Institution fields
      account_type:             body.account_type             || 'individual',
      institution_type:         body.institution_type         || null,
      institution_display_name: sanitiseText(body.institution_display_name),
      contact_person_name:      sanitiseText(body.contact_person_name),
      contact_person_role:      sanitiseText(body.contact_person_role),
      institution_website:      sanitiseUrl(body.institution_website),
      institution_cac:          sanitiseText(body.institution_cac),
      // #6 Open to Opportunities — LinkedIn-style discoverability signal.
      // Empty-string expiry normalised to null so the indexed-partial column
      // is clean; DB treats null-expiry as "forever while toggle is on".
      open_to_opportunities:       typeof body.open_to_opportunities === 'boolean' ? body.open_to_opportunities : false,
      open_to_opportunities_until: body.open_to_opportunities_until && body.open_to_opportunities_until.length > 0
        ? body.open_to_opportunities_until
        : null,
    }

    const { error } = await supabaseAny
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' })

    if (error) throw error
    return NextResponse.json({ success: true, username })
  } catch (err: unknown) {
    console.error('Profile save error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save profile' },
      { status: 500 }
    )
  }
}
