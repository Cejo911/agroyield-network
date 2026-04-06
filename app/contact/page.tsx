'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  if (!form.name || !form.email || !form.message) return
  setLoading(true)
  setError(false)
  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) throw new Error('Failed')
    setSubmitted(true)
  } catch {
    setError(true)
  }
  setLoading(false)

  }

  const inputStyle = {
    width: '100%', padding: '14px 18px', fontSize: 15,
    background: '#0c1c11', border: '1.5px solid #1c3825',
    borderRadius: 12, color: '#f0fdf4', outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box' as const,
    transition: 'border-color 0.2s'
  }

  const labelStyle = {
    display: 'block', fontSize: 13, fontWeight: 600,
    color: '#6ee7b7', marginBottom: 8
  }

  return (
    <main style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#060d09', color: '#f0fdf4', minHeight: '100vh', lineHeight: 1.6 }}>

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', background: 'rgba(6,13,9,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(34,197,94,0.08)' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg, #16a34a, #22c55e)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>🌾</div>
          <span style={{ fontSize: 17, fontWeight: 800, color: '#f0fdf4', letterSpacing: '-0.3px' }}>Agro<span style={{ color: '#22c55e' }}>Yield</span></span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <a href="/about" style={{ fontSize: 13, fontWeight: 600, color: '#bbf7d0', textDecoration: 'none' }}>About</a>
          <a href="/contact" style={{ fontSize: 13, fontWeight: 600, color: '#22c55e', textDecoration: 'none' }}>Contact</a>
          <a href="/#waitlist" style={{ fontSize: 13, fontWeight: 600, color: '#22c55e', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 100, padding: '6px 16px', textDecoration: 'none' }}>
            Join Waitlist
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ position: 'relative', paddingTop: 160, paddingBottom: 80, paddingLeft: 24, paddingRight: 24, textAlign: 'center', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(34,197,94,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.04) 1px, transparent 1px)', backgroundSize: '64px 64px', maskImage: 'radial-gradient(ellipse 70% 60% at 50% 30%, black 40%, transparent 100%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 600, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#22c55e', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 100, padding: '7px 16px', marginBottom: 36 }}>
            <span style={{ width: 7, height: 7, background: '#22c55e', borderRadius: '50%', display: 'inline-block' }} />
            Get in Touch
          </div>
          <h1 style={{ fontSize: 'clamp(34px, 5vw, 58px)', fontWeight: 900, lineHeight: 1.08, letterSpacing: -2, color: '#f0fdf4', marginBottom: 20 }}>
            We&apos;d love to<br />
            <span style={{ background: 'linear-gradient(90deg, #22c55e, #4ade80)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>hear from you.</span>
          </h1>
          <p style={{ fontSize: 17, color: '#bbf7d0', lineHeight: 1.7 }}>
            Whether you&apos;re a researcher, institution, investor, or just curious — our inbox is open.
          </p>
        </div>
      </section>

      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #1c3825, transparent)', margin: '0 40px' }} />

      {/* MAIN CONTENT */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '80px 24px 120px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 48, alignItems: 'start' }}>

        {/* LEFT — contact info */}
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f0fdf4', letterSpacing: -0.5, marginBottom: 8 }}>Contact information</h2>
          <p style={{ fontSize: 15, color: '#bbf7d0', lineHeight: 1.7, marginBottom: 40 }}>
            For partnerships, press, or general enquiries — reach us directly or use the form.
          </p>

          {[
            { icon: '✉️', label: 'General Enquiries', value: 'hello@agroyield.africa', href: 'mailto:hello@agroyield.africa' },
            { icon: '🤝', label: 'Partnerships & Institutions', value: 'partners@agroyield.africa', href: 'mailto:partners@agroyield.africa' },
            { icon: '📣', label: 'Press & Media', value: 'press@agroyield.africa', href: 'mailto:press@agroyield.africa' },
            { icon: '📍', label: 'Based in', value: 'Nigeria · Open to all of Africa', href: null },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
              <div style={{ flexShrink: 0, width: 44, height: 44, background: '#0c1c11', border: '1px solid #1c3825', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{item.icon}</div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#4b7a5c', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{item.label}</p>
                {item.href
                  ? <a href={item.href} style={{ fontSize: 14, color: '#22c55e', textDecoration: 'none', fontWeight: 500 }}>{item.value}</a>
                  : <p style={{ fontSize: 14, color: '#bbf7d0' }}>{item.value}</p>
                }
              </div>
            </div>
          ))}

          <div style={{ marginTop: 40, padding: '24px 28px', background: '#0c1c11', border: '1px solid #1c3825', borderRadius: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#22c55e', marginBottom: 6 }}>⏱ Response time</p>
            <p style={{ fontSize: 14, color: '#bbf7d0', lineHeight: 1.65 }}>We typically respond within <strong style={{ color: '#f0fdf4' }}>1–2 business days</strong>. For urgent matters, email us directly at hello@agroyield.africa.</p>
          </div>
        </div>

        {/* RIGHT — form */}
        <div>
          {submitted ? (
            <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 20, padding: '48px 40px', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 20 }}>🌱</div>
              <h3 style={{ color: '#4ade80', fontWeight: 800, fontSize: 22, marginBottom: 12 }}>Message received!</h3>
              <p style={{ color: '#bbf7d0', fontSize: 15, lineHeight: 1.7 }}>Thanks for reaching out, {form.name.split(' ')[0]}. We&apos;ll get back to you within 1–2 business days at <strong style={{ color: '#f0fdf4' }}>{form.email}</strong>.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ background: '#0c1c11', border: '1px solid #1c3825', borderRadius: 20, padding: '40px 36px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Full name *</label>
                  <input name="name" value={form.name} onChange={handleChange} placeholder="Chidi Okonkwo" required style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Email address *</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" required style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Subject</label>
                <select name="subject" value={form.subject} onChange={handleChange} style={inputStyle}>
                  <option value="">Select a topic…</option>
                  <option value="Partnership">Partnership or Institutional Collaboration</option>
                  <option value="Investment">Investment or Funding</option>
                  <option value="Press">Press or Media Enquiry</option>
                  <option value="Advisory">Advisory Board Interest</option>
                  <option value="General">General Question</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Message *</label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Tell us what's on your mind…"
                  required
                  rows={5}
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                />
              </div>

              {error && (
                <p style={{ fontSize: 13, color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px' }}>
                  Something went wrong. Please try emailing us directly at hello@agroyield.africa.
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '16px 28px', fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
                  color: '#030a05', background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  border: 'none', borderRadius: 12, cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(34,197,94,0.25)', opacity: loading ? 0.6 : 1,
                  transition: 'opacity 0.2s'
                }}
              >
                {loading ? 'Sending…' : 'Send Message →'}
              </button>
              <p style={{ fontSize: 12, color: '#4b7a5c', textAlign: 'center' }}>We respect your privacy. No spam, ever.</p>
            </form>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid #1c3825', padding: '28px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <p style={{ fontSize: 13, color: '#4b7a5c' }}>© 2026 AgroYield Network. All rights reserved.</p>
        <div style={{ display: 'flex', gap: 24 }}>
          {['Contact', 'Privacy', 'About', 'Twitter / X', 'LinkedIn'].map(link => (
            <a key={link}
              href={link === 'Contact' ? 'mailto:hello@agroyield.africa' : link === 'About' ? '/about' : '#'}
              style={{ fontSize: 13, color: '#4b7a5c', textDecoration: 'none' }}>{link}</a>
          ))}
        </div>
      </footer>

    </main>
  )
}
