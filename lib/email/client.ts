// Lazy Resend client — avoids throwing at module-load time during `next build`
// when RESEND_API_KEY isn't present in the build environment.
// Call getResend() inside request handlers; the client is initialised on first use.

import { Resend } from 'resend'

let _resend: Resend | null = null

export function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY)
  }
  return _resend
}
