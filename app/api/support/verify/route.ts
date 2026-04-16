import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getResend } from '@/lib/email/client'
import { SENDERS } from '@/lib/email/senders'
import { escapeHtml } from '@/lib/sanitise'

/**
 * POST /api/support/verify
 *
 * Send a one-time verification code (OTP) to the user's email.
 * Requires authentication.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Generate 6-digit random code
    const code = Math.floor(100000 + Math.random() * 900000).toString()

    const admin = getSupabaseAdmin()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000) // 15 minutes

    // Delete any existing unexpired tokens for this user
    await admin
      .from('support_tokens')
      .delete()
      .eq('user_id', user.id)
      .is('verified_at', null)

    // Insert new token
    await admin
      .from('support_tokens')
      .insert({
        user_id: user.id,
        token: code,
        expires_at: expiresAt.toISOString(),
      })

    // Fetch user's profile for greeting
    const { data: profile } = await admin
      .from('profiles')
      .select('first_name')
      .eq('id', user.id)
      .maybeSingle()

    const firstName = profile?.first_name || 'there'
    const escapedName = escapeHtml(firstName)

    // Send email via Resend
    const resend = getResend()
    await resend.emails.send({
      from: SENDERS.security,
      to: user.email ?? '',
      subject: 'Your AgroYield Support Verification Code',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
              .code-box { background: white; border: 2px solid #10b981; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
              .code { font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #10b981; font-family: 'Courier New', monospace; }
              .expires { color: #666; font-size: 14px; margin-top: 15px; }
              .footer { color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 15px; text-align: center; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>AgroYield Support</h1>
              </div>
              <div class="content">
                <p>Hi ${escapedName},</p>
                <p>We received a request to verify your support ticket access. Use the code below to proceed:</p>
                <div class="code-box">
                  <div class="code">${code}</div>
                </div>
                <p class="expires">This code expires in 15 minutes. If you didn't request this, you can safely ignore this email.</p>
                <p>Best regards,<br>The AgroYield Team</p>
              </div>
              <div class="footer">
                <p>© 2026 AgroYield Network. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    })

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send verification code'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/support/verify
 *
 * Verify a one-time code and mark the token as verified.
 * Requires authentication and a valid 6-digit token in request body.
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { token } = await request.json() as { token?: string }

    // Validate token format (must be 6-digit string)
    if (!token || !/^\d{6}$/.test(token)) {
      return NextResponse.json(
        { error: 'Invalid or expired code' },
        { status: 400 }
      )
    }

    const admin = getSupabaseAdmin()
    const now = new Date()

    // Query for unexpired, unverified token
    const { data: record } = await admin
      .from('support_tokens')
      .select('id, token, expires_at, verified_at')
      .eq('user_id', user.id)
      .is('verified_at', null)
      .gt('expires_at', now.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Check if record exists and token matches
    if (!record || record.token !== token) {
      return NextResponse.json(
        { error: 'Invalid or expired code' },
        { status: 400 }
      )
    }

    // Mark as verified
    await admin
      .from('support_tokens')
      .update({ verified_at: now.toISOString() })
      .eq('id', record.id)

    return NextResponse.json({ ok: true, verified: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to verify code'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
