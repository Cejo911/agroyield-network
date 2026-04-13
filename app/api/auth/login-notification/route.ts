import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { recordLoginAndNotify } from '@/lib/auth/login-notification'

/**
 * Called by the client after a successful password login.
 * The OAuth flow calls recordLoginAndNotify() directly from the callback route.
 * Never blocks the login flow — always returns 200 on best-effort basis.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false }, { status: 401 })

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? request.headers.get('x-real-ip')
      ?? 'unknown'
    const userAgent = request.headers.get('user-agent') ?? 'unknown'

    const result = await recordLoginAndNotify({
      userId:    user.id,
      userEmail: user.email,
      ip,
      userAgent,
    })
    return NextResponse.json(result)
  } catch (e) {
    console.error('login-notification route error:', e)
    return NextResponse.json({ ok: false })
  }
}
