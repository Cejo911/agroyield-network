/**
 * Cron auth verification.
 *
 * All cron routes call verifyCronAuth() as their first line.
 * Returns null if authorised, or a NextResponse if not (caller returns early).
 *
 * Env var: CRON_SECRET (set in Vercel env vars; Vercel cron invocations
 * include the header `authorization: Bearer $CRON_SECRET` automatically).
 */

import { NextResponse } from 'next/server'

export function verifyCronAuth(request: Request): NextResponse | null {
  if (!process.env.CRON_SECRET) {
    // Fail-closed if secret not configured on the server
    return NextResponse.json(
      { error: 'CRON_SECRET not configured' },
      { status: 500 }
    )
  }

  const authHeader = request.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET}`

  if (authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null // authorised
}
