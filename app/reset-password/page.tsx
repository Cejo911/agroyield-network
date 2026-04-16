'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import ThemeToggle from '@/app/components/ThemeToggle'

export default function ResetPassword() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    setTimeout(() => router.push('/dashboard'), 3000)
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
          <Image src="/logo-horizontal-colored.png" alt="AgroYield Network" className="auth-logo-colored" width={110} height={58} />
          <Image src="/logo-horizontal-white.png"   alt="AgroYield Network" className="auth-logo-white"   width={110} height={58} />
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <ThemeToggle />
        </div>
      </nav>

      {/* FORM */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 440 }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ margin: '0 auto 24px', display: 'flex', justifyContent: 'center' }}>
              <Image src="/logo-stacked-colored.png" alt="AgroYield Network" className="auth-logo-colored" width={94} height={120} />
              <Image src="/logo-stacked-white.png"   alt="AgroYield Network" className="auth-logo-white"   width={94} height={120} />
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: -1, marginBottom: 8 }}>Set a new password</h1>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>Choose a strong password for your account</p>
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 20, padding: '36px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {success ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>Password updated!</h2>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  Your password has been changed successfully. Redirecting you to the dashboard…
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-label)', marginBottom: 8 }}>New password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" required style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-label)', marginBottom: 8 }}>Confirm new password</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter your password" required style={inputStyle} />
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
                  {loading ? 'Updating…' : 'Update Password →'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}