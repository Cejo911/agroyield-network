'use client'
import { useState } from 'react'
import ThemeToggle from '@/app/components/ThemeToggle'

export default function ContactClient() {
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
    background: 'var(--bg-card)', border: '1.5px solid var(--border-color)',
    borderRadius: 12, color: 'var(--text-primary)', outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box' as const,
    transition: 'border-color 0.2s',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 13, fontWeight: 600,
    color: 'var(--text-muted)', marginBottom: 8,
  }

  return (
    <main style={{ fontFamily: "'Inter', system-ui, sans-serif", background: 'var(--bg-page)', color: 'var(--text-primary)', minHeight: '100vh', lineHeight: 1.6 }}>
      <style>{`
        :root {
          --bg-page: #ffffff;
          --bg-card: #f9fafb;
          --border-color: #e5e7eb;
          --text-primary: #111827;
          --text-secondary: #374151;
          --text-accent: #16a34a;
          --text-muted: #6b7280;
          --text-footer: #9ca3af;
          --divider: #d1d5db;
          --nav-bg: rgba(255,255,255,0.92);
          --nav-border: rgba(0,0,0,0.06);
          --badge-bg: rgba(22,163,74,0.08);
          --badge-border: rgba(22,163,74,0.2);
          --icon-bg: #f3f4f6;
          --icon-border: #e5e7eb;
          --response-box-bg: #f9fafb;
          --response-box-border: #e5e7eb;
          --strong-color: #111827;
        }
        .dark {
          --bg-page: #060d09;
          --bg-card: #0c1c11;
          --border-color: #1c3825;
          --text-primary: #f0fdf4;
          --text-secondary: #bbf7d0;
          --text-accent: #22c55e;
          --text-muted: #6ee7b7;
          --text-footer: #4b7a5c;
          --divider: #1c3825;
          --nav-bg: rgba(6,13,9,0.85);
          --nav-border: rgba(34,197,94,0.08);
          --badge-bg: rgba(34,197,94,0.08);
          --badge-border: rgba(34,197,94,0.2);
          --icon-bg: #0c1c11;
          --icon-border: #1c3825;
          --response-box-bg: #0c1c11;
          --response-box-border: #1c3825;
          --strong-color: #f0fdf4;
        }
        .agy-nav { padding: 20px 40px; }
        .agy-nav-links { display: flex; align-items: center; gap: 20px; }
        .agy-section-hero { padding-top: 80px; padding-bottom: 80px; padding-left: 24px; padding-right: 24px; }
        .agy-main-content { padding: 80px 24px 120px; }
        .agy-form-name-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .agy-footer { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; padding: 28px 40px; }
        .agy-footer-links { display: flex; gap: 24px; flex-wrap: wrap; }
        @media (max-width: 768px) {
          .agy-nav { padding: 16px 20px; }
          .agy-nav-links { gap: 10px; }
          .agy-nav-about { display: none; }
          .agy-section-hero { padding-top: 48px; padding-bottom: 60px; padding-left: 16px; padding-right: 16px; }
          .agy-main-content { padding: 60px 16px 80px; }
          .agy-form-name-row { grid-template-columns: 1fr; }
          .agy-footer { flex-direction: column; align-items: flex-start; padding: 24px 20px; }
          .agy-footer-links { gap: 16px; }
        }
        @media (max-width: 480px) {
          .agy-nav-contact-hide { display: none; }
          .agy-footer-links { gap: 12px; }
        }
        .agy-input-focus:focus { border-color: var(--text-accent) !important; }
        .auth-logo-colored { display: block; }
        .auth-logo-white   { display: none; }
        .dark .auth-logo-colored { display: none; }
        .dark .auth-logo-white   { display: block; }
      `}</style>

      {/* NAV */}
      <nav className="agy-nav" style={{ position: 'sticky', top: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--nav-bg)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--nav-border)' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src="/logo-horizontal-colored.png" alt="AgroYield Network" className="auth-logo-colored" style={{ height: 58, width: 'auto' }} />
          <img src="/logo-horizontal-white.png"   alt="AgroYield Network" className="auth-logo-white"   style={{ height: 58, width: 'auto' }} />
        </a>
        <div className="agy-nav-links">
          <a href="/about" className="agy-nav-about" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textDecoration: 'none' }}>About</a>
          <a href="/contact" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-accent)', textDecoration: 'none' }}>Contact</a>
          <ThemeToggle />
          <a href="/" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-accent)', background: 'var(--badge-bg)', border: '1px solid var(--badge-border)', borderRadius: 100, padding: '6px 16px', textDecoration: 'none' }}>
            Join Waitlist
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section className="agy-section-hero" style={{ position: 'relative', textAlign: 'center', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(34,197,94,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.04) 1px, transparent 1px)', backgroundSize: '64px 64px', maskImage: 'radial-gradient(ellipse 70% 60% at 50% 30%, black 40%, transparent 100%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 600, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--text-accent)', background: 'var(--badge-bg)', border: '1px solid var(--badge-border)', borderRadius: 100, padding: '7px 16px', marginBottom: 36 }}>
            <span style={{ width: 7, height: 7, background: 'var(--text-accent)', borderRadius: '50%', display: 'inline-block' }} />
            Get in Touch
          </div>
          <h1 style={{ fontSize: 'clamp(34px, 5vw, 58px)', fontWeight: 900, lineHeight: 1.08, letterSpacing: -2, color: 'var(--text-primary)', marginBottom: 20 }}>
            We&apos;d love to<br />
            <span style={{ background: 'linear-gradient(90deg, #22c55e, #4ade80)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              hear from you.
            </span>
          </h1>
          <p style={{ fontSize: 17, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            Whether you&apos;re a researcher, institution, investor, or just curious — our inbox is open.
          </p>
        </div>
      </section>

      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, var(--divider), transparent)', margin: '0 24px' }} />

      {/* MAIN CONTENT */}
      <section className="agy-main-content" style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 48, alignItems: 'start' }}>
        {/* LEFT — contact info */}
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.5, marginBottom: 8 }}>Contact information</h2>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 40 }}>
            For partnerships, press, or general enquiries — reach us directly or use the form.
          </p>
          {[
            { icon: '✉️', label: 'General Enquiries',              value: 'hello@agroyield.africa',    href: 'mailto:hello@agroyield.africa' },
            { icon: '🤝', label: 'Partnerships & Institutions',    value: 'partners@agroyield.africa', href: 'mailto:partners@agroyield.africa' },
            { icon: '📣', label: 'Press & Media',                  value: 'press@agroyield.africa',    href: 'mailto:press@agroyield.africa' },
            { icon: '📍', label: 'Based in',                       value: 'Nigeria · Open to all of Africa', href: null },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
              <div style={{ flexShrink: 0, width: 44, height: 44, background: 'var(--icon-bg)', border: '1px solid var(--icon-border)', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{item.icon}</div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-footer)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 3 }}>{item.label}</p>
                {item.href
                  ? <a href={item.href} style={{ fontSize: 14, color: 'var(--text-accent)', textDecoration: 'none', fontWeight: 500 }}>{item.value}</a>
                  : <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{item.value}</p>
                }
              </div>
            </div>
          ))}
          <div style={{ marginTop: 40, padding: '24px 28px', background: 'var(--response-box-bg)', border: '1px solid var(--response-box-border)', borderRadius: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-accent)', marginBottom: 6 }}>⏱ Response time</p>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
              We typically respond within <strong style={{ color: 'var(--strong-color)' }}>1–2 business days</strong>. For urgent matters, email us directly at hello@agroyield.africa.
            </p>
          </div>
        </div>

        {/* RIGHT — form */}
        <div>
          {submitted ? (
            <div style={{ background: 'var(--badge-bg)', border: '1px solid var(--badge-border)', borderRadius: 20, padding: '48px 40px', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 20 }}>🌱</div>
              <h3 style={{ color: '#4ade80', fontWeight: 800, fontSize: 22, marginBottom: 12 }}>Message received!</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.7 }}>
                Thanks for reaching out, {form.name.split(' ')[0]}. We&apos;ll get back to you within 1–2 business days at <strong style={{ color: 'var(--strong-color)' }}>{form.email}</strong>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 20, padding: '40px 36px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="agy-form-name-row">
                <div>
                  <label style={labelStyle}>Full name *</label>
                  <input name="name" value={form.name} onChange={handleChange} placeholder="Your full name" required className="agy-input-focus" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Email address *</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" required className="agy-input-focus" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Subject</label>
                <select name="subject" value={form.subject} onChange={handleChange} className="agy-input-focus" style={inputStyle}>
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
                  className="agy-input-focus"
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
                style={{ padding: '16px 28px', fontSize: 15, fontWeight: 700, fontFamily: 'inherit', color: '#030a05', background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', borderRadius: 12, cursor: 'pointer', boxShadow: '0 4px 20px rgba(34,197,94,0.25)', opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s' }}
              >
                {loading ? 'Sending…' : 'Send Message →'}
              </button>
              <p style={{ fontSize: 12, color: 'var(--text-footer)', textAlign: 'center' }}>We respect your privacy. No spam, ever.</p>
            </form>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="agy-footer" style={{ borderTop: '1px solid var(--border-color)' }}>
        <p style={{ fontSize: 13, color: 'var(--text-footer)' }}>© 2026 AgroYield Network. All rights reserved.</p>
        <p style={{ fontSize: 11, color: 'var(--text-footer)', opacity: 0.6, marginTop: 4 }}>An Agcoms International Project</p>
        <div className="agy-footer-links">
          {['Contact', 'Privacy', 'About', 'Twitter / X', 'LinkedIn'].map(link => (
            <a key={link}
              href={link === 'Contact' ? 'mailto:hello@agroyield.africa' : link === 'About' ? '/about' : '#'}
              style={{ fontSize: 13, color: 'var(--text-footer)', textDecoration: 'none' }}
            >{link}</a>
          ))}
        </div>
      </footer>
    </main>
  )
}
