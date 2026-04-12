import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Missing invite token' }, { status: 400 })
    }

    // Use service role to look up the invitation (bypasses RLS)
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Look up the invitation
    const { data: invite, error: lookupError } = await admin
      .from('business_team')
      .select('id, business_id, email, role, status, user_id')
      .eq('invite_token', token)
      .single()

    if (lookupError || !invite) {
      return NextResponse.json({ error: 'Invalid or expired invitation link' }, { status: 404 })
    }

    if (invite.status === 'revoked') {
      return NextResponse.json({ error: 'This invitation has been revoked by the business owner' }, { status: 410 })
    }

    if (invite.status === 'accepted') {
      return NextResponse.json({ error: 'This invitation has already been accepted' }, { status: 400 })
    }

    // Get business name for display
    const { data: business } = await admin
      .from('businesses')
      .select('name, user_id')
      .eq('id', invite.business_id)
      .single()

    // Get inviter name
    let inviterName = 'A business owner'
    if (business) {
      const { data: profile } = await admin
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', business.user_id)
        .single()
      if (profile) {
        inviterName = `${profile.first_name} ${profile.last_name}`.trim()
      }
    }

    const details = {
      business_name: business?.name || 'Unknown Business',
      role: invite.role,
      invited_by_name: inviterName,
    }

    // Check if the user is logged in
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // Not logged in — return details so the frontend can show login/signup
      return NextResponse.json({
        code: 'LOGIN_REQUIRED',
        details,
      }, { status: 401 })
    }

    // Verify the logged-in user's email matches the invitation
    if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
      return NextResponse.json({
        error: `This invitation was sent to ${invite.email}. You are logged in as ${user.email}. Please log in with the correct account.`,
      }, { status: 403 })
    }

    // Accept the invitation
    const { error: updateError } = await admin
      .from('business_team')
      .update({
        status: 'accepted',
        user_id: user.id,
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invite.id)

    if (updateError) {
      console.error('Accept error:', updateError)
      return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 })
    }

    return NextResponse.json({ success: true, details })

  } catch (error) {
    console.error('Accept invite error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
