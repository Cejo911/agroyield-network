import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

/**
 * Facebook Data Deletion Callback
 *
 * Called by Facebook when a user removes the app from their account.
 * Receives a signed_request, verifies it, and initiates data deletion.
 * Returns a confirmation code and status URL per Facebook's requirements.
 *
 * Docs: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const signedRequest = formData.get('signed_request') as string

    if (!signedRequest) {
      return NextResponse.json({ error: 'Missing signed_request' }, { status: 400 })
    }

    // Parse and verify the signed request from Facebook
    const data = parseSignedRequest(signedRequest)
    if (!data) {
      return NextResponse.json({ error: 'Invalid signed_request' }, { status: 403 })
    }

    const facebookUserId = data.user_id
    const confirmationCode = crypto.randomUUID()

    // Find the Supabase user linked to this Facebook ID
    // Facebook user IDs are stored in the auth.users identities
    const { data: { users }, error: listError } = await getSupabaseAdmin().auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })

    if (!listError && users) {
      const matchedUser = users.find(user =>
        user.identities?.some(
          identity => identity.provider === 'facebook' && identity.id === facebookUserId
        )
      )

      if (matchedUser) {
        // Flag the user's profile for deletion
        await (getSupabaseAdmin() as any).from('profiles').update({
          deletion_requested: true,
          deletion_code: confirmationCode,
          deletion_requested_at: new Date().toISOString(),
        }).eq('id', matchedUser.id)

        console.log(`Facebook deletion request for user ${matchedUser.id}, code: ${confirmationCode}`)
      }
    }

    // Facebook requires this exact JSON response format
    const { origin } = new URL(request.url)
    return NextResponse.json({
      url: `${origin}/data-deletion?code=${confirmationCode}`,
      confirmation_code: confirmationCode,
    })
  } catch (err) {
    console.error('Facebook deletion callback error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/**
 * Parse and verify Facebook's signed_request parameter.
 * The signed_request is a base64url-encoded JSON payload with an HMAC-SHA256 signature.
 */
function parseSignedRequest(signedRequest: string) {
  const [encodedSig, payload] = signedRequest.split('.')
  if (!encodedSig || !payload) return null

  // Decode the signature and payload
  const sig = Buffer.from(encodedSig.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
  const data = JSON.parse(
    Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
  )

  // Verify the signature using the app secret
  const expectedSig = crypto
    .createHmac('sha256', process.env.FACEBOOK_APP_SECRET!)
    .update(payload)
    .digest()

  if (!crypto.timingSafeEqual(sig, expectedSig)) {
    console.error('Facebook signed_request signature mismatch')
    return null
  }

  return data
}
