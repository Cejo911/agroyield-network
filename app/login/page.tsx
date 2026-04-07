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
            <p style
