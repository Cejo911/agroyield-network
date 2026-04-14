import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // ── Public community post pages (SEO) — allow anonymous read access ──
  const communityPostMatch = request.nextUrl.pathname.match(/^\/community\/([^/]+)$/)
  if (communityPostMatch) {
    return response // let the page handle auth-optional logic
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // ── Maintenance mode check ──
  // Skip for admin page so admins can still access the dashboard to toggle it off
  if (!request.nextUrl.pathname.startsWith('/admin')) {
    try {
      const adminDb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { data: maintenanceSetting } = await (adminDb as any)
        .from('settings').select('value').eq('key', 'maintenance_enabled').maybeSingle()

      if (maintenanceSetting?.value === 'true') {
        // Check if user is admin — admins bypass maintenance
        const { data: profile } = await (adminDb as any)
          .from('profiles').select('is_admin').eq('id', user.id).single()
        if (!profile?.is_admin) {
          return NextResponse.redirect(new URL('/maintenance', request.url))
        }
      }
    } catch {
      // If settings check fails, don't block the user
    }
  }

  return response
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/profile/:path*',
    '/directory/:path*',
    '/opportunities/:path*',
    '/prices/:path*',
    '/marketplace/:path*',
    '/research/:path*',
    '/mentorship/:path*',
    '/grants/:path*',
    '/community/:path*',
    '/messages/:path*',
    '/insights/:path*',
    '/connections/:path*',
  ]
}
