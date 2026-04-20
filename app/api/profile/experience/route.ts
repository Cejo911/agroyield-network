import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitiseText } from '@/lib/sanitise'

// API for managing one-to-many `profile_experience` rows.
//
// Routes:
//   POST   /api/profile/experience       — create a new row for the caller
//   PATCH  /api/profile/experience       — update an existing row (must own it)
//   DELETE /api/profile/experience?id=…  — delete a row (must own it)
//
// RLS on the table enforces ownership; the validators here keep input clean
// (string lengths, date sanity) and produce friendly 400 errors instead of
// raw Postgres constraint violations.

const MAX_ROLE_LEN         = 150
const MAX_ORG_LEN          = 150
const MAX_DESCRIPTION_LEN  = 2000

type ExperiencePayload = {
  role?:         string
  organisation?: string
  start_date?:   string
  end_date?:     string | null
  is_current?:   boolean
  description?:  string | null
}

function validate(body: ExperiencePayload, partial: boolean): { ok: true; clean: Record<string, unknown> } | { ok: false; error: string } {
  const out: Record<string, unknown> = {}

  // Role
  if (body.role !== undefined) {
    const r = sanitiseText(body.role)?.trim() ?? ''
    if (!r) return { ok: false, error: 'Role is required' }
    if (r.length > MAX_ROLE_LEN) return { ok: false, error: `Role must be ≤ ${MAX_ROLE_LEN} characters` }
    out.role = r
  } else if (!partial) {
    return { ok: false, error: 'Role is required' }
  }

  // Organisation
  if (body.organisation !== undefined) {
    const o = sanitiseText(body.organisation)?.trim() ?? ''
    if (!o) return { ok: false, error: 'Organisation is required' }
    if (o.length > MAX_ORG_LEN) return { ok: false, error: `Organisation must be ≤ ${MAX_ORG_LEN} characters` }
    out.organisation = o
  } else if (!partial) {
    return { ok: false, error: 'Organisation is required' }
  }

  // Start date
  if (body.start_date !== undefined) {
    if (!body.start_date || isNaN(new Date(body.start_date).getTime())) {
      return { ok: false, error: 'Start date is required and must be a valid date' }
    }
    out.start_date = body.start_date
  } else if (!partial) {
    return { ok: false, error: 'Start date is required' }
  }

  // is_current — implicitly clears end_date
  if (body.is_current !== undefined) {
    out.is_current = !!body.is_current
    if (body.is_current === true) out.end_date = null
  }

  // End date — only set if explicitly provided AND is_current isn't true
  if (body.end_date !== undefined && out.is_current !== true) {
    if (body.end_date === null || body.end_date === '') {
      out.end_date = null
    } else {
      if (isNaN(new Date(body.end_date).getTime())) {
        return { ok: false, error: 'End date must be a valid date' }
      }
      const endTs   = new Date(body.end_date).getTime()
      const startTs = new Date((out.start_date as string) ?? body.start_date ?? '').getTime()
      if (!isNaN(startTs) && endTs < startTs) {
        return { ok: false, error: 'End date cannot be before start date' }
      }
      out.end_date = body.end_date
    }
  }

  // Description (optional, capped)
  if (body.description !== undefined) {
    const d = body.description ? sanitiseText(body.description) : null
    if (d && d.length > MAX_DESCRIPTION_LEN) {
      return { ok: false, error: `Description must be ≤ ${MAX_DESCRIPTION_LEN} characters` }
    }
    out.description = d || null
  }

  return { ok: true, clean: out }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json()) as ExperiencePayload
  const v = validate(body, false)
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any
  const { data, error } = await supabaseAny
    .from('profile_experience')
    .insert({ profile_id: user.id, ...v.clean })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, row: data })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json()) as ExperiencePayload & { id?: string }
  if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const v = validate(body, true)
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any
  const { data, error } = await supabaseAny
    .from('profile_experience')
    .update(v.clean)
    .eq('id', body.id)
    .eq('profile_id', user.id) // belt-and-braces; RLS already enforces this
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, row: data })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any
  const { error } = await supabaseAny
    .from('profile_experience')
    .delete()
    .eq('id', id)
    .eq('profile_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
