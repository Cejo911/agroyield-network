import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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

    // Check if username already exists for this user
    const { data: existing } = await supabaseAny
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single()

    let username: string | null = existing?.username ?? null

    // Generate username only if not already set and both names are provided
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
      first_name: body.first_name || null,
      last_name: body.last_name || null,
      role: body.role || null,
      bio: body.bio || null,
      location: body.location || null,
      institution: body.institution || null,
      interests: body.interests?.length ? body.interests : null,
      linkedin: body.linkedin || null,
      twitter: body.twitter || null,
      website: body.website || null,
      avatar_url: body.avatar_url || null,
      updated_at: new Date().toISOString(),
      ...(username ? { username } : {}),
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
