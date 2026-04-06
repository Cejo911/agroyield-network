'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SignUp() {
  const router = useRouter()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirm) {
      setError('Passwords do not match.')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
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
    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    setSuccess(true)
    setLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 18px', fontSize: 15,
    background: '#0c1c11', border: '1.5px solid #1c3825',
    borderRadius: 12, color: '#f0fdf4', outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box'
  }

  if (success) {
    return (
      <main style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#060d09', color: '#f0fdf4', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 24 }}>🌱</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#f0fdf4', letterSpacing: -1, marginBottom: 12 }}>Check your inbox!</h1>
          <p style={{ fontSize: 16, color: '#bbf7d0', lineHeight: 1.75, marginBottom: 32 }}>
            We&apos;ve sent a confirmation link to <strong style={{ color: '#f0fdf4' }}>{form.email}</strong>. Click the link to activate your account and access AgroYield.
          </p>
          <a href="/login" style={{ display: 'inline-block', padding: '14px 28px', fontSize: 14, fontWeight: 700, color: '#030a05', background: 'linear-gradient(135deg, #22c55e, #16a34a)', borderRadius: 12, textDecoration: 'none' }}>
            Go to Sign In →
          </a>
        </div>
      </main>
    )
  }

  return (
    <main style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#060d09', color: '#f0fdf4', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* NAV */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', borderBottom: '1px solid rgba(34,197,94,0.08)' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg, #16a34a, #22c55e)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>🌾</div>
          <span style={{ fontSize: 17, fontWeight: 800, color: '#f0fdf4', letterSpacing: '-0.3px' }}>Agro<span style={{ color: '#22c55e' }}>Yield</span></span>
        </a>
        <a href="/login" style={{ fontSize: 13, color: '#bbf7d0', textDecoration: 'none' }}>Already have an account? <span style={{ color: '#22c55e', fontWeight: 600 }}>Sign in</span></a>
      </nav>

      {/* FORM */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 480 }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg, #16a34a, #22c55e)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 24px' }}>🌾</div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#f0fdf4', letterSpacing: -1, marginBottom: 8 }}>Create your account</h1>
            <p style={{ fontSize: 15, color: '#bbf7d0' }}>Join AgroYield Network as a founding member</p>
          </div>

          {/* Card */}
          <form onSubmit={handleSignUp} style={{ background: '#0c1c11', border: '1px solid #1c3825', borderRadius: 20, padding: '36px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#6ee7b7', marginBottom: 8 }}>First name</label>
                <input name="firstName" value={form.firstName} onChange={handleChange} placeholder="Chidi" required style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#6ee7b7', marginBottom: 8 }}>Last name</label>
                <input name="lastName" value={form.lastName} onChange={handleChange} placeholder="Okonkwo" required style={inputStyle} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#6ee7b7', marginBottom: 8 }}>Email address</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" required style={inputStyle} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#6ee7b7', marginBottom: 8 }}>Password</label>
              <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="At least 8 characters" required style={inputStyle} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#6ee7b7', marginBottom: 8 }}>Confirm password</label>
              <input name="confirm" type="password" value={form.confirm} onChange={handleChange} placeholder="Repeat your password" required style={inputStyle} />
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
              {loading ? 'Creating account…' : 'Create Account →'}
            </button>

            <p style={{ textAlign: 'center', fontSize: 13, color: '#4b7a5c', margin: 0 }}>
              Already have an account?{' '}
              <a href="/login" style={{ color: '#22c55e', textDecoration: 'none', fontWeight: 600 }}>Sign in</a>
            </p>

          </form>

          <p style={{ textAlign: 'center', fontSize: 12, color: '#4b7a5c', marginTop: 24 }}>
            By creating an account you agree to our{' '}
            <a href="#" style={{ color: '#4b7a5c', textDecoration: 'underline' }}>Terms of Service</a>
            {' '}and{' '}
            <a href="#" style={{ color: '#4b7a5c', textDecoration: 'underline' }}>Privacy Policy</a>
          </p>

        </div>
      </div>

    </main>
  )
}
