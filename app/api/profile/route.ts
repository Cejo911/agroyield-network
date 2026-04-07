import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

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
      avatar_url:  body.avatar_url  || null,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('Profile save error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save profile' },
      { status: 500 }
    )
  }
}
