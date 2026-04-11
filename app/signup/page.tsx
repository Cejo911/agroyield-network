'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import ThemeToggle from '@/app/components/ThemeToggle'

export default function SignUp() {
  const router = useRouter()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [registrationEnabled, setRegistrationEnabled] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/registration-status')
      .then(r => r.json())
      .then(data => setRegistrationEnabled(data.enabled))
      .catch(() => setRegistrationEnabled(true))
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleGoogleSignUp = async () => {
    if (!registrationEnabled) return
    setGoogleLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (err) {
      setError(err.message)
      setGoogleLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!registrationEnabled) return
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: 'https://agroyield.africa/auth/callback',
        data: {
          first_name: form.firstName,
          last_name: form.lastName,
          full_name: `${form.firstName} ${form.lastName}`,
        }
      }
    })
    if (err) { setError(err.message); setLoading(false); return }
    setSuccess(true)
    setLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 18px', fontSize: 15,
    background: 'var(--input-bg)', border: '1.5px solid var(--border-color)',
    borderRadius: 12, color: 'var(--text-primary)', outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box',
  }

  // ── Loading state ──────────────────────────────────────────────
  if (registrationEnabled === null) {
    return (
      <>
        <style>{`
          :root {
            --bg-page: #f9fafb;
            --text-muted: #6b7280;
          }
          .dark {
            --bg-page: #060d09;
            --text-muted: #4b7a5c;
          }
        `}</style>
        <main style={{ fontFamily: "'Inter', system-ui, sans-serif", background: 'var(--bg-page)', color: 'var(--text-muted)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading…</p>
        </main>
      </>
    )
  }

  // ── Registration closed ────────────────────────────────────────
  if (!registrationEnabled) {
    return (
      <>
        <style>{`
          :root {
            --bg-page: #f9fafb;
            --text-primary: #111827;
            --text-secondary: #374151;
          }
          .dark {
            --bg-page: #060d09;
            --text-primary: #f0fdf4;
            --text-secondary: #bbf7d0;
          }
        `}</style>
        <main style={{ fontFamily: "'Inter', system-ui, sans-serif", background: 'var(--bg-page)', color: 'var(--text-primary)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 24 }}>🔒</div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: -1, marginBottom: 12 }}>
              Registration is closed
            </h1>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 32 }}>
              AgroYield Network is not accepting new members at this time. Check back soon or sign in if you already have an account.
            </p>
            <a href="/login" style={{ display: 'inline-block', padding: '14px 28px', fontSize: 14, fontWeight: 700, color: '#030a05', background: 'linear-gradient(135deg, #22c55e, #16a34a)', borderRadius: 12, textDecoration: 'none' }}>
              Sign In →
            </a>
          </div>
        </main>
      </>
    )
  }

  // ── Success ────────────────────────────────────────────────────
  if (success) {
    return (
      <>
        <style>{`
          :root {
            --bg-page: #f9fafb;
            --text-primary: #111827;
            --text-secondary: #374151;
          }
          .dark {
            --bg-page: #060d09;
            --text-primary: #f0fdf4;
            --text-secondary: #bbf7d0;
          }
        `}</style>
        <main style={{ fontFamily: "'Inter', system-ui, sans-serif", background: 'var(--bg-page)', color: 'var(--text-primary)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 24 }}>🌱</div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: -1, marginBottom: 12 }}>Check your inbox!</h1>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 32 }}>
              We&apos;ve sent a confirmation link to <strong style={{ color: 'var(--text-primary)' }}>{form.email}</strong>. Click the link to activate your account and access AgroYield.
            </p>
            <a href="/login" style={{ display: 'inline-block', padding: '14px 28px', fontSize: 14, fontWeight: 700, color: '#030a05', background: 'linear-gradient(135deg, #22c55e, #16a34a)', borderRadius: 12, textDecoration: 'none' }}>
              Go to Sign In →
            </a>
          </div>
        </main>
      </>
    )
  }

  // ── Sign up form ───────────────────────────────────────────────
  return (
    <>
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

      <main style={{ fontFamily: "'Inter', system-ui, sans-serif", background: 'var(--bg-page)', color: 'var(--text-primary)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

        {/* NAV */}
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', borderBottom: '1px solid var(--nav-border)' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <Image src="/logo-horizontal-colored.png" alt="AgroYield Network" width={160} height={40} className="auth-logo-colored" style={{ height: 40, width: 'auto' }} />
            <Image src="/logo-horizontal-white.png" alt="AgroYield Network" width={160} height={40} className="auth-logo-white" style={{ height: 40, width: 'auto' }} />
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ThemeToggle />
            <a href="/login" style={{ fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}>
              Already have an account? <span style={{ color: 'var(--text-accent)', fontWeight: 600 }}>Sign in</span>
            </a>
          </div>
        </nav>

        {/* FORM */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
          <div style={{ width: '100%', maxWidth: 480 }}>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <div style={{ margin: '0 auto 24px', display: 'flex', justifyContent: 'center' }}>
                <Image src="/logo-stacked-colored.png" alt="AgroYield Network" width={80} height={80} className="auth-logo-colored" style={{ height: 80, width: 'auto' }} />
                <Image src="/logo-stacked-white.png" alt="AgroYield Network" width={80} height={80} className="auth-logo-white" style={{ height: 80, width: 'auto' }} />
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: -1, marginBottom: 8 }}>Create your account</h1>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>Join AgroYield Network as a founding member</p>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 20, padding: '36px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Google Button */}
              <button
                type="button"
                onClick={handleGoogleSignUp}
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
                <div style={{ flex: 1, height: 1, background: 'var(--divider-bg)' }} />
                <span style={{ fontSize: 12, color: 'var(--divider-text)', whiteSpace: 'nowrap' }}>or sign up with email</span>
                <div style={{ flex: 1, height: 1, background: 'var(--divider-bg)' }} />
              </div>

              {/* Email form */}
              <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-label)', marginBottom: 8 }}>First name</label>
                    <input name="firstName" value={form.firstName} onChange={handleChange} placeholder="Chidi" required style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-label)', marginBottom: 8 }}>Last name</label>
                    <input name="lastName" value={form.lastName} onChange={handleChange} placeholder="Okonkwo" required style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-label)', marginBottom: 8 }}>Email address</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" required style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-label)', marginBottom: 8 }}>Password</label>
                  <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="At least 8 characters" required style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-label)', marginBottom: 8 }}>Confirm password</label>
                  <input name="confirm" type="password" value={form.confirm} onChange={handleChange} placeholder="Repeat your password" required style={inputStyle} />
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
                  {loading ? 'Creating account…' : 'Create Account →'}
                </button>
              </form>

              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                Already have an account?{' '}
                <a href="/login" style={{ color: 'var(--text-accent)', textDecoration: 'none', fontWeight: 600 }}>Sign in</a>
              </p>
            </div>

            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 24 }}>
              By creating an account you agree to our{' '}
              <a href="/terms" style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>Terms of Service</a>
              {' '}and{' '}
              <a href="/privacy" style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>Privacy Policy</a>
            </p>
          </div>
        </div>

      </main>
    </>
  )
}
