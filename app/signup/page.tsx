'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import ThemeToggle from '@/app/components/ThemeToggle'

const INSTITUTION_TYPES = [
  { value: 'university',   label: 'University / Research Institute' },
  { value: 'government',   label: 'Government Agency' },
  { value: 'ngo',          label: 'NGO / Foundation' },
  { value: 'agri_company', label: 'Agri-Company / Cooperative' },
] as const

export default function SignUp() {
  const router = useRouter()
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirm: '',
    accountType: 'individual' as 'individual' | 'institution',
    institutionName: '',
    institutionType: '' as '' | 'university' | 'government' | 'ngo' | 'agri_company',
    contactRole: '',
  })
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

  const handleLinkedInSignUp = async () => {
    if (!registrationEnabled) return
    setGoogleLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (err) {
      setError(err.message)
      setGoogleLoading(false)
    }
  }

  const handleFacebookSignUp = async () => {
    if (!registrationEnabled) return
    setGoogleLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
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

    // Institution-specific required fields
    if (form.accountType === 'institution') {
      if (!form.institutionName.trim()) { setError('Please enter your institution name.'); return }
      if (!form.institutionType)        { setError('Please select an institution type.'); return }
    }

    setLoading(true)
    setError('')
    const supabase = createClient()
    const isInstitution = form.accountType === 'institution'
    const metadata: Record<string, string> = {
      first_name: form.firstName,
      last_name: form.lastName,
      full_name: `${form.firstName} ${form.lastName}`,
      account_type: form.accountType,
    }
    if (isInstitution) {
      metadata.institution_display_name = form.institutionName.trim()
      metadata.institution_type         = form.institutionType
      metadata.contact_person_name      = `${form.firstName} ${form.lastName}`.trim()
      if (form.contactRole.trim()) metadata.contact_person_role = form.contactRole.trim()
    }
    const { error: err } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: 'https://agroyield.africa/auth/callback',
        data: metadata,
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
            <Link href="/login" style={{ display: 'inline-block', padding: '14px 28px', fontSize: 14, fontWeight: 700, color: '#030a05', background: 'linear-gradient(135deg, #22c55e, #16a34a)', borderRadius: 12, textDecoration: 'none' }}>
              Sign In →
            </Link>
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
            <Image src="/logo-icon-colored.png" alt="AgroYield Network" width={56} height={56} style={{ marginBottom: 24, display: 'inline-block' }} />
            <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: -1, marginBottom: 12 }}>Check your inbox!</h1>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 32 }}>
              We&apos;ve sent a confirmation link to <strong style={{ color: 'var(--text-primary)' }}>{form.email}</strong>. Click the link to activate your account and access AgroYield.
            </p>
            <Link href="/login" style={{ display: 'inline-block', padding: '14px 28px', fontSize: 14, fontWeight: 700, color: '#030a05', background: 'linear-gradient(135deg, #22c55e, #16a34a)', borderRadius: 12, textDecoration: 'none' }}>
              Go to Sign In →
            </Link>
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
          <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <Image src="/logo-horizontal-colored.png" alt="AgroYield Network" width={200} height={58} className="auth-logo-colored" style={{ height: 58, width: 'auto' }} />
            <Image src="/logo-horizontal-white.png" alt="AgroYield Network" width={200} height={58} className="auth-logo-white" style={{ height: 58, width: 'auto' }} />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ThemeToggle />
            <Link href="/login" style={{ fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}>
              Already have an account? <span style={{ color: 'var(--text-accent)', fontWeight: 600 }}>Sign in</span>
            </Link>
          </div>
        </nav>

        {/* FORM */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
          <div style={{ width: '100%', maxWidth: 480 }}>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <div style={{ margin: '0 auto 24px', display: 'flex', justifyContent: 'center' }}>
                <Image src="/logo-stacked-colored.png" alt="AgroYield Network" width={120} height={120} className="auth-logo-colored" style={{ height: 120, width: 'auto' }} />
                <Image src="/logo-stacked-white.png" alt="AgroYield Network" width={120} height={120} className="auth-logo-white" style={{ height: 120, width: 'auto' }} />
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: -1, marginBottom: 8 }}>
                {form.accountType === 'institution' ? 'Register your institution' : 'Create your account'}
              </h1>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>Join AgroYield Network as a member or institution</p>
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
                onClick={handleLinkedInSignUp}
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
                onClick={handleFacebookSignUp}
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

              {/* Email form */}
              <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Account type selector */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-label)', marginBottom: 8 }}>I am registering as</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <button type="button" onClick={() => setForm(prev => ({ ...prev, accountType: 'individual' }))}
                      style={{
                        padding: '14px 16px', borderRadius: 12, fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
                        cursor: 'pointer', transition: 'all 0.2s',
                        background: form.accountType === 'individual' ? 'rgba(34,197,94,0.1)' : 'transparent',
                        border: form.accountType === 'individual' ? '2px solid #22c55e' : '2px solid var(--border-color)',
                        color: form.accountType === 'individual' ? '#16a34a' : 'var(--text-secondary)',
                      }}>
                      👤 Individual
                    </button>
                    <button type="button" onClick={() => setForm(prev => ({ ...prev, accountType: 'institution' }))}
                      style={{
                        padding: '14px 16px', borderRadius: 12, fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
                        cursor: 'pointer', transition: 'all 0.2s',
                        background: form.accountType === 'institution' ? 'rgba(34,197,94,0.1)' : 'transparent',
                        border: form.accountType === 'institution' ? '2px solid #22c55e' : '2px solid var(--border-color)',
                        color: form.accountType === 'institution' ? '#16a34a' : 'var(--text-secondary)',
                      }}>
                      🏛 Institution
                    </button>
                  </div>
                  {form.accountType === 'institution' && (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                      For universities, government agencies, NGOs, and agri-companies. Admin verification required before posting.
                    </p>
                  )}
                </div>

                {/* Institution identity (only when accountType === 'institution') */}
                {form.accountType === 'institution' && (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-label)', marginBottom: 8 }}>
                        Institution name <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        name="institutionName"
                        value={form.institutionName}
                        onChange={handleChange}
                        placeholder="e.g. Ahmadu Bello University, Green Acres Cooperative"
                        required
                        style={inputStyle}
                      />
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                        This is the public display name that appears across the network.
                      </p>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-label)', marginBottom: 8 }}>
                        Institution type <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {INSTITUTION_TYPES.map(t => (
                          <button
                            key={t.value}
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, institutionType: t.value }))}
                            style={{
                              padding: '12px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                              cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left',
                              background: form.institutionType === t.value ? 'rgba(34,197,94,0.1)' : 'transparent',
                              border: form.institutionType === t.value ? '2px solid #22c55e' : '2px solid var(--border-color)',
                              color: form.institutionType === t.value ? '#16a34a' : 'var(--text-secondary)',
                            }}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-label)', marginBottom: 8 }}>
                        Contact person&rsquo;s role <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>(optional)</span>
                      </label>
                      <input
                        name="contactRole"
                        value={form.contactRole}
                        onChange={handleChange}
                        placeholder="e.g. Director of Research, Programme Lead"
                        style={inputStyle}
                      />
                    </div>
                  </>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-label)', marginBottom: 8 }}>
                      {form.accountType === 'institution' ? 'Contact person first name' : 'First name'}
                    </label>
                    <input name="firstName" value={form.firstName} onChange={handleChange} placeholder="Chidi" required autoComplete="given-name" autoFocus style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-label)', marginBottom: 8 }}>
                      {form.accountType === 'institution' ? 'Contact person last name' : 'Last name'}
                    </label>
                    <input name="lastName" value={form.lastName} onChange={handleChange} placeholder="Okonkwo" required autoComplete="family-name" style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-label)', marginBottom: 8 }}>Email address</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" required autoComplete="email" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-label)', marginBottom: 8 }}>Password</label>
                  <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="At least 8 characters" required autoComplete="new-password" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-label)', marginBottom: 8 }}>Confirm password</label>
                  <input name="confirm" type="password" value={form.confirm} onChange={handleChange} placeholder="Repeat your password" required autoComplete="new-password" style={inputStyle} />
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
                    transition: 'opacity 0.2s', marginTop: 4
                  }}
                >
                  {loading ? 'Creating account…' : 'Create Account →'}
                </button>
              </form>

              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                Already have an account?{' '}
                <Link href="/login" style={{ color: 'var(--text-accent)', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
              </p>
            </div>

            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 24 }}>
              By creating an account you agree to our{' '}
              <Link href="/terms" style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>Privacy Policy</Link>
            </p>
          </div>
        </div>

      </main>
    </>
  )
}
