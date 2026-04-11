'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ThemeToggle from '@/app/components/ThemeToggle'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
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
          --bg-page: #f9fafb; --nav-border: rgba(0,0,0,0.06); --bg-card: #ffffff;
          --border-color: #e5e7eb; --input-bg: #f3f4f6; --text-primary: #111827;
          --text-secondary: #374151; --text-label: #374151; --text-muted: #6b7280;
          --text-accent: #16a34a;
        }
        .dark {
          --bg-page: #060d09; --nav-border: rgba(34,197,94,0.08); --bg-card: #0c1c11;
          --border-color: #1c3825; --input-bg: #0c1c11; --text-primary: #f0fdf4;
          --text-secondary: #bbf7d0; --text-label: #6ee7b7; --text-muted: #4b7a5c;
          --text-accent: #22c55e;
        }
        .auth-logo-colored { display: block; }
        .auth-logo-white   { display: none; }
        .dark .auth-logo-colored { display: none; }
        .dark .auth-logo-white   { display: block; }
      `}</style>

      {/* NAV */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', borderBottom: '1px solid var(--nav-border)' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src="/logo-horizontal-colored.png" alt="AgroYield Network" className="auth-logo-colored" style={{ height: 58, width: 'auto' }} />
          <img src="/logo-horizontal-white.png"   alt="AgroYield Network" className="auth-logo-white"   style={{ height: 58, width: 'auto' }} />
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <ThemeToggle />
          <a href="/login" style={{ fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}>← Back to login</a>
        </div>
      </nav>

      {/* FORM */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 440 }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ margin: '0 auto 24px', display: 'flex', justifyContent: 'center' }}>
              <img src="/logo-stacked-colored.png" alt="AgroYield Network" className="auth-logo-colored" style={{ height: 120, width: 'auto' }} />
              <img src="/logo-stacked-white.png"   alt="AgroYield Network" className="auth-logo-white"   style={{ height: 120, width: 'auto' }} />
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: -1, marginBottom: 8 }}>Reset your password</h1>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>
              Enter your email and we&apos;ll send you a reset link
            </p>
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 20, padding: '36px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {sent ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✉️</div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>Check your email</h2>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  We sent a password reset link to <strong>{email}</strong>. Click the link in the email to set a new password.
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 16 }}>
                  Didn&apos;t get it? Check your spam folder or{' '}
                  <button
                    onClick={() => setSent(false)}
                    style={{ color: 'var(--text-accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, padding: 0 }}
                  >
                    try again
                  </button>
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-label)', marginBottom: 8 }}>Email address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required style={inputStyle} />
                </div>
                {error && (
                  <div style={{ fontSize: 13, color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px' }}>
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '15px 28px', fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
                    color: '#030a05', background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                    border: 'none', borderRadius: 12, cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 20px rgba(34,197,94,0.25)', opacity: loading ? 0.6 : 1,
                    transition: 'opacity 0.2s', marginTop: 4,
                  }}
                >
                  {loading ? 'Sending…' : 'Send Reset Link →'}
                </button>
              </form>
            )}

            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
              Remember your password?{' '}
              <a href="/login" style={{ color: 'var(--text-accent)', textDecoration: 'none', fontWeight: 600 }}>Sign in</a>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}