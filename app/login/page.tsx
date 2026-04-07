'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

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
    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    router.push('/dashboard')
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (err) {
      setError(err.message)
      setGoogleLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 18px', fontSize: 15,
    background: '#0c1c11', border: '1.5px solid #1c3825',
    borderRadius: 12, color: '#f0fdf4', outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box'
  }

  return (
    <main style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#060d09', color: '#f0fdf4', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* NAV */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', borderBottom: '1px solid rgba(34,197,94,0.08)' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg, #16a34a, #22c55e)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>🌾</div>
          <span style={{ fontSize: 17, fontWeight: 800, color: '#f0fdf4', letterSpacing: '-0.3px' }}>Agro<span style={{ color: '#22c55e' }}>Yield</span></span>
        </a>
        <a href="/" style={{ fontSize: 13, color: '#bbf7d0', textDecoration: 'none' }}>← Back to home</a>
      </nav>

      {/* FORM */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 440 }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg, #16a34a, #22c55e)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 24px' }}>🌾</div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#f0fdf4', letterSpacing: -1, marginBottom: 8 }}>Welcome back</h1>
            <p style={{ fontSize: 15, color: '#bbf7d0' }}>Sign in to your AgroYield account</p>
          </div>

          {/* Card */}
          <div style={{ background: '#0c1c11', border: '1px solid #1c3825', borderRadius: 20, padding: '36px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Google Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                padding: '13px 20px', fontSize: 15, fontWeight: 600, fontFamily: 'inherit',
                color: '#f0fdf4', background: '#0f2318', border: '1.5px solid #1c3825',
                borderRadius: 12, cursor: (googleLoading || loading) ? 'not-allowed' : 'pointer',
                opacity: (googleLoading || loading) ? 0.6 : 1,
                transition: 'border-color 0.2s, background 0.2s',
              }}
              onMouseEnter={e => { if (!googleLoading && !loading) (e.currentTarget as HTMLButtonElement).style.borderColor = '#22c55e' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#1c3825' }}
            >
              {/* Google SVG */}
              <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {googleLoading ? 'Redirecting…' : 'Continue with Google'}
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 1, background: '#1c3825' }} />
              <span style={{ fontSize: 12, color: '#4b7a5c', whiteSpace: 'nowrap' }}>or sign in with email</span>
              <div style={{ flex: 1, height: 1, background: '#1c3825' }} />
            </div>

            {/* Email / Password form */}
            <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#6ee7b7', marginBottom: 8 }}>Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#6ee7b7' }}>Password</label>
                  <a href="/forgot-password" style={{ fontSize: 12, color: '#22c55e', textDecoration: 'none' }}>Forgot password?</a>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  style={inputStyle}
                />
              </div>
              {error && (
                <div style={{ fontSize: 13, color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px' }}>
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
                  transition: 'opacity 0.2s', marginTop: 4
                }}
              >
                {loading ? 'Signing in…' : 'Sign In →'}
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: 13, color: '#4b7a5c', margin: 0 }}>
              Don&apos;t have an account?{' '}
              <a href="/signup" style={{ color: '#22c55e', textDecoration: 'none', fontWeight: 600 }}>Sign up</a>
            </p>
          </div>

          <p style={{ textAlign: 'center', fontSize: 12, color: '#4b7a5c', marginTop: 24 }}>
            By signing in you agree to our{' '}
<a href="/terms" style={{ color: '#4b7a5c', textDecoration: 'underline' }}>Terms of Service</a>
{' '}and{' '}
<a href="/privacy" style={{ color: '#4b7a5c', textDecoration: 'underline' }}>Privacy Policy</a>
          </p>
        </div>
      </div>
    </main>
  )
}
