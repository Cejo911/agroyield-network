'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
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
          <form onSubmit={handleSignIn} style={{ background: '#0c1c11', border: '1px solid #1c3825', borderRadius: 20, padding: '36px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>

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
              disabled={loading}
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

            <p style={{ textAlign: 'center', fontSize: 13, color: '#4b7a5c', margin: 0 }}>
              Don&apos;t have an account?{' '}
              <a href="/signup" style={{ color: '#22c55e', textDecoration: 'none', fontWeight: 600 }}>Sign up</a>
            </p>

          </form>

          <p style={{ textAlign: 'center', fontSize: 12, color: '#4b7a5c', marginTop: 24 }}>
            By signing in you agree to our{' '}
            <a href="#" style={{ color: '#4b7a5c', textDecoration: 'underline' }}>Terms of Service</a>
            {' '}and{' '}
            <a href="#" style={{ color: '#4b7a5c', textDecoration: 'underline' }}>Privacy Policy</a>
          </p>
        </div>
      </div>

    </main>
  )
}
