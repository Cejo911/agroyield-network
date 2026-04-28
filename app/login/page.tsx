'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import ThemeToggle from '@/app/components/ThemeToggle'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) { setError(err.message); setLoading(false); return }
    // Fire-and-forget new-device notification — never block the login flow
    fetch('/api/auth/login-notification', { method: 'POST' }).catch(() => {})
    router.push('/dashboard')
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (err) { setError(err.message); setGoogleLoading(false) }
  }

  const handleLinkedInSignIn = async () => {
    setGoogleLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (err) { setError(err.message); setGoogleLoading(false) }
  }

  const handleFacebookSignIn = async () => {
    setGoogleLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (err) { setError(err.message); setGoogleLoading(false) }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 18px', fontSize: 15,
    background: 'var(--input-bg)', border: '1.5px solid var(--border-color)',
    borderRadius: 12, color: 'var(--text-primary)', outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box',
  }

  return (
    <main style={{ fontFamily: "'Inter', system-ui, sans-serif", background: 'var(--bg-page)', color: 'var(--text-primary)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        :root {
          --bg-page: #f9fafb;
          --nav-border: rgba(0,0,0,0.06);
          --bg-card: #ffffff;
          --border-color: #e5e7eb;
          --input-bg: #f3f4f6;
          --text-primary: #111827;
          --text-secondary: #374151;
          --text-label: #374151;
          --text-muted: #6b7280;
          --text-accent: #16a34a;
          --divider-bg: #e5e7eb;
          --divider-text: #9ca3af;
          --google-btn-bg: #ffffff;
          --google-btn-border: #e5e7eb;
        }
        .dark {
          --bg-page: #060d09;
          --nav-border: rgba(34,197,94,0.08);
          --bg-card: #0c1c11;
          --border-color: #1c3825;
          --input-bg: #0c1c11;
          --text-primary: #f0fdf4;
          --text-secondary: #bbf7d0;
          --text-label: #6ee7b7;
          --text-muted: #4b7a5c;
          --text-accent: #22c55e;
          --divider-bg: #1c3825;
          --divider-text: #4b7a5c;
          --google-btn-bg: #0f2318;
          --google-btn-border: #1c3825;
        }
        .auth-logo-colored { display: block; }
        .auth-logo-white   { display: none; }
        .dark .auth-logo-colored { display: none; }
        .dark .auth-logo-white   { display: block; }
      `}</style>

      {/* NAV */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', borderBottom: '1px solid var(--nav-border)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <Image src="/logo-horizontal-colored.png" alt="AgroYield Network" className="auth-logo-colored" width={200} height={58} style={{ height: 58, width: 'auto' }} />
          <Image src="/logo-horizontal-white.png"   alt="AgroYield Network" className="auth-logo-white"   width={200} height={58} style={{ height: 58, width: 'auto' }} />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <ThemeToggle />
          <Link href="/" style={{ fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}>← Back to home</Link>
        </div>
      </nav>

      {/* FORM */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 440 }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ margin: '0 auto 24px', display: 'flex', justifyContent: 'center' }}>
              <Image src="/logo-stacked-colored.png" alt="AgroYield Network" className="auth-logo-colored" width={120} height={120} style={{ height: 120, width: 'auto' }} />
              <Image src="/logo-stacked-white.png"   alt="AgroYield Network" className="auth-logo-white"   width={120} height={120} style={{ height: 120, width: 'auto' }} />
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: -1, marginBottom: 8 }}>Welcome back</h1>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>Sign in to your AgroYield account</p>
          </div>

          {/* Card */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 20, padding: '36px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Google Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                padding: '13px 20px', fontSize: 15, fontWeight: 600, fontFamily: 'inherit',
                color: 'var(--text-primary)', background: 'var(--google-btn-bg)',
                border: '1.5px solid var(--google-btn-border)',
                borderRadius: 12, cursor: (googleLoading || loading) ? 'not-allowed' : 'pointer',
                opacity: (googleLoading || loading) ? 0.6 : 1, transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => { if (!googleLoading && !loading) (e.currentTarget as HTMLButtonElement).style.borderColor = '#22c55e' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--google-btn-border)' }}
            >
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {googleLoading ? 'Redirecting…' : 'Continue with Google'}
            </button>

            {/* LinkedIn Button */}
            <button
              type="button"
              onClick={handleLinkedInSignIn}
              disabled={googleLoading || loading}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                padding: '13px 20px', fontSize: 15, fontWeight: 600, fontFamily: 'inherit',
                color: 'var(--text-primary)', background: 'var(--google-btn-bg)',
                border: '1.5px solid var(--google-btn-border)',
                borderRadius: 12, cursor: (googleLoading || loading) ? 'not-allowed' : 'pointer',
                opacity: (googleLoading || loading) ? 0.6 : 1, transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => { if (!googleLoading && !loading) (e.currentTarget as HTMLButtonElement).style.borderColor = '#0a66c2' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--google-btn-border)' }}
            >
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill="#0A66C2"/>
              </svg>
              {googleLoading ? 'Redirecting…' : 'Continue with LinkedIn'}
            </button>

            {/* Facebook Button */}
            <button
              type="button"
              onClick={handleFacebookSignIn}
              disabled={googleLoading || loading}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                padding: '13px 20px', fontSize: 15, fontWeight: 600, fontFamily: 'inherit',
                color: 'var(--text-primary)', background: 'var(--google-btn-bg)',
                border: '1.5px solid var(--google-btn-border)',
                borderRadius: 12, cursor: (googleLoading || loading) ? 'not-allowed' : 'pointer',
                opacity: (googleLoading || loading) ? 0.6 : 1, transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => { if (!googleLoading && !loading) (e.currentTarget as HTMLButtonElement).style.borderColor = '#1877F2' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--google-btn-border)' }}
            >
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/>
              </svg>
              {googleLoading ? 'Redirecting…' : 'Continue with Facebook'}
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--divider-bg)' }} />
              <span style={{ fontSize: 12, color: 'var(--divider-text)', whiteSpace: 'nowrap' }}>or continue with email</span>
              <div style={{ flex: 1, height: 1, background: 'var(--divider-bg)' }} />
            </div>

            {/* Email / Password form */}
            <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-label)', marginBottom: 8 }}>Email address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" autoFocus style={inputStyle} />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-label)' }}>Password</label>
                  <Link href="/forgot-password" style={{ fontSize: 12, color: 'var(--text-accent)', textDecoration: 'none' }}>Forgot password?</Link>
                </div>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required autoComplete="current-password" style={inputStyle} />
              </div>
              {error && (
                <div role="alert" style={{ fontSize: 13, color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px' }}>
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading || googleLoading}
                style={{
                  padding: '15px 28px', fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
                  color: '#030a05', background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  border: 'none', borderRadius: 12, cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 20px rgba(34,197,94,0.25)', opacity: loading ? 0.6 : 1,
                  transition: 'opacity 0.2s', marginTop: 4,
                }}
              >
                {loading ? 'Signing in…' : 'Sign In →'}
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
              Don&apos;t have an account?{' '}
              <Link href="/signup" style={{ color: 'var(--text-accent)', textDecoration: 'none', fontWeight: 600 }}>Sign up</Link>
            </p>
          </div>

          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 24 }}>
            By signing in you agree to our{' '}
            <Link href="/terms" style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>Terms of Service</Link>
            {' '}and{' '}
            <Link href="/privacy" style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>Privacy Policy</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
