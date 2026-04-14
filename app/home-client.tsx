'use client'
import { useState, useEffect } from 'react'
import ThemeToggle from '@/app/components/ThemeToggle'

function Countdown() {
  const LAUNCH = new Date('2026-07-05T00:00:00')
  const calc = () => {
    const diff = LAUNCH.getTime() - Date.now()
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
    return {
      days:    Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours:   Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    }
  }
  const [time, setTime] = useState(calc)
  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000)
    return () => clearInterval(id)
  }, [])
  const pad = (n: number) => String(n).padStart(2, '0')
  const units = [
    { label: 'Days',    value: time.days,    raw: true },
    { label: 'Hours',   value: time.hours,   raw: false },
    { label: 'Minutes', value: time.minutes, raw: false },
    { label: 'Seconds', value: time.seconds, raw: false },
  ]
  return (
    <div style={{ margin: '0 auto 44px', textAlign: 'center' }}>
      <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--countdown-label)', marginBottom: 18 }}>
        Platform launches in
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' as const }}>
        {units.map(({ label, value, raw }) => (
          <div key={label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 16, padding: '18px 22px', minWidth: 76, textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, color: 'var(--text-accent)', letterSpacing: -1, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {raw ? String(value) : pad(value)}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--countdown-label)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginTop: 8 }}>
              {label}
            </div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 13, color: 'var(--countdown-label)', marginTop: 14 }}>
        Launching <strong style={{ color: 'var(--text-muted)' }}>5 July 2026</strong> — join the waitlist to get early access
      </p>
    </div>
  )
}

function WaitlistForm({ id }: { id: string }) {
  const [email,     setEmail]     = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error('Failed')
      setSubmitted(true)
    } catch {
      setError(true)
    }
    setLoading(false)
  }

  if (submitted) {
    return (
      <div style={{ background: 'var(--badge-bg)', border: '1px solid var(--badge-border)', borderRadius: 14, padding: '24px 32px', maxWidth: 420, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🌱</div>
        <h3 style={{ color: '#4ade80', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>You&apos;re on the list!</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Check your inbox — we&apos;ve sent you a confirmation. Tell a friend who&apos;s in agriculture!</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 12, maxWidth: 520, margin: '0 auto 16px', flexWrap: 'wrap' as const, justifyContent: 'center' }}>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Enter your email address"
        required
        style={{
          flex: 1, minWidth: 240, padding: '15px 20px', fontSize: 15,
          background: 'var(--bg-card)',
          border: error ? '1.5px solid #ef4444' : '1.5px solid var(--border-color)',
          borderRadius: 12, color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit',
        }}
      />
      <button
        type="submit"
        disabled={loading}
        style={{
          padding: '15px 28px', fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
          color: '#030a05', background: 'linear-gradient(135deg, #22c55e, #16a34a)',
          border: 'none', borderRadius: 12, cursor: 'pointer', whiteSpace: 'nowrap' as const,
          boxShadow: '0 4px 20px rgba(34,197,94,0.3)', opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? 'Joining…' : id === 'bottom' ? 'Get Early Access →' : 'Join the Waitlist →'}
      </button>
    </form>
  )
}

const modules = [
  {
    icon: '🤝', tag: 'Module 01', name: 'Connections & Insights Feed', wide: true,
    desc: 'A professional network built for agriculture. Connect with researchers, farmers, funders, and agripreneurs. Follow a live feed of market updates, research breakthroughs, and community milestones — filtered by what matters to you.',
    pills: ['Messaging', 'Network Feed', 'Polls & Articles', 'Market Flash'],
  },
  {
    icon: '🎯', tag: 'Module 02', name: 'Opportunities', wide: false,
    desc: "Jobs, internships, partnerships and training in one place. Discover career openings, find collaborators, and register for agri conferences — all without the endless email lists.",
    pills: ['Jobs & Internships', 'Partnerships', 'Training'],
  },
  {
    icon: '🏷️', tag: 'Module 03', name: 'Price Tracker', wide: false,
    desc: 'Real-time commodity prices across Nigerian markets — from Mile 12 to Bodija. Set price alerts for your crops and never sell below market rate again.',
    pills: ['Live Prices', 'Price Alerts', 'Market History'],
  },
  {
    icon: '🤝', tag: 'Module 04', name: 'Marketplace', wide: false,
    desc: 'List your produce, equipment, seeds, and agri-inputs. Connect directly with verified buyers and sellers across Nigeria — no middlemen, no market commissions.',
    pills: ['Produce Listings', 'Equipment', 'Direct Inquiries'],
  },
  {
    icon: '📚', tag: 'Module 05', name: 'Research Board', wide: false,
    desc: 'Publish papers, join open collaborations, and build your academic profile. For researchers who want their work to reach the farmers who need it most.',
    pills: ['Paper Repository', 'Collaborations', 'Citation Tracking'],
  },
  {
    icon: '💼', tag: 'Module 06', name: 'Business Suite', wide: true,
    desc: 'Run your agribusiness end-to-end. Create professional invoices and receipts, manage your product catalogue, track customers, and get a clear picture of your revenue — all without a spreadsheet.',
    pills: ['Invoicing', 'Customer Management', 'Product Catalogue', 'Revenue Reports'],
  },
]

export default function Home() {
  return (
    <main id="top" style={{ fontFamily: "'Inter', system-ui, sans-serif", background: 'var(--bg-page)', color: 'var(--text-primary)', minHeight: '100vh', lineHeight: 1.6 }}>
      <style>{`
        :root {
          --bg-page: #ffffff;
          --bg-card: #f9fafb;
          --bg-card-deep: #ecfdf5;
          --border-color: #e5e7eb;
          --text-primary: #111827;
          --text-secondary: #374151;
          --text-accent: #16a34a;
          --text-muted: #6b7280;
          --text-footer: #9ca3af;
          --countdown-label: #6b7280;
          --divider: #d1d5db;
          --nav-bg: rgba(255,255,255,0.92);
          --nav-border: rgba(0,0,0,0.06);
          --badge-bg: rgba(22,163,74,0.08);
          --badge-border: rgba(22,163,74,0.2);
          --strong-color: #111827;
          --pill-text: #16a34a;
          --pill-bg: rgba(22,163,74,0.07);
          --pill-border: rgba(22,163,74,0.15);
        }
        .dark {
          --bg-page: #060d09;
          --bg-card: #0c1c11;
          --bg-card-deep: #0f2318;
          --border-color: #1c3825;
          --text-primary: #f0fdf4;
          --text-secondary: #bbf7d0;
          --text-accent: #22c55e;
          --text-muted: #6ee7b7;
          --text-footer: #4b7a5c;
          --countdown-label: #4b7a5c;
          --divider: #1c3825;
          --nav-bg: rgba(6,13,9,0.85);
          --nav-border: rgba(34,197,94,0.08);
          --badge-bg: rgba(34,197,94,0.08);
          --badge-border: rgba(34,197,94,0.2);
          --strong-color: #6ee7b7;
          --pill-text: #6ee7b7;
          --pill-bg: rgba(34,197,94,0.07);
          --pill-border: rgba(34,197,94,0.12);
        }
        .agy-nav { padding: 20px 40px; }
        .agy-nav-links { display: flex; align-items: center; gap: 20px; }
        .agy-module-wide { grid-column: span 2; }
        .agy-modules-section { padding: 100px 24px; }
        .agy-cta-section { padding: 100px 24px 120px; }
        .agy-footer { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; padding: 28px 40px; }
        .agy-footer-links { display: flex; gap: 24px; flex-wrap: wrap; }
        @media (max-width: 768px) {
          .agy-nav { padding: 16px 20px; }
          .agy-nav-links { gap: 10px; }
          .agy-nav-about { display: none; }
          .agy-module-wide { grid-column: span 1; }
          .agy-modules-section { padding: 60px 16px; }
          .agy-cta-section { padding: 60px 16px 80px; }
          .agy-footer { flex-direction: column; align-items: flex-start; padding: 24px 20px; }
          .agy-footer-links { gap: 16px; }
        }
        @media (max-width: 480px) {
          .agy-nav-links { gap: 8px; }
          .agy-nav-contact { display: none; }

        }
      `}</style>

      {/* NAV */}
      <nav className="agy-nav" style={{ position: 'sticky', top: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--nav-bg)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--nav-border)' }}>
        <a href="#top" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
  <img src="/logo-horizontal-colored.png" alt="AgroYield Network" style={{ height: 58, width: 'auto' }} />
</a>
        <div className="agy-nav-links">
          <a href="/about"   className="agy-nav-about"   style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textDecoration: 'none' }}>About</a>
          <a href="/contact" className="agy-nav-contact" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textDecoration: 'none' }}>Contact</a>
          <ThemeToggle />
          <a href="#top" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-accent)', background: 'var(--badge-bg)', border: '1px solid var(--badge-border)', borderRadius: 100, padding: '6px 16px', textDecoration: 'none' }}>
            Join Waitlist
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section id="top-section" style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '60px 24px 80px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(34,197,94,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.04) 1px, transparent 1px)', backgroundSize: '64px 64px', maskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, black 40%, transparent 100%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 700, height: 500, background: 'radial-gradient(ellipse at center, rgba(34,197,94,0.13) 0%, rgba(34,197,94,0.04) 50%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 780 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--text-accent)', background: 'var(--badge-bg)', border: '1px solid var(--badge-border)', borderRadius: 100, padding: '7px 16px', marginBottom: 36 }}>
            <span style={{ width: 7, height: 7, background: 'var(--text-accent)', borderRadius: '50%', display: 'inline-block' }} />
            Now Building — Join the Founding Members
          </div>
          <h1 style={{ fontSize: 'clamp(40px, 6.5vw, 76px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: -2, color: 'var(--text-primary)', marginBottom: 24 }}>
            Agriculture is a<br />
            <span style={{ background: 'linear-gradient(90deg, #22c55e, #4ade80)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Business.</span><br />
            Build Yours.
          </h1>
          <p style={{ fontSize: 'clamp(17px, 2vw, 20px)', color: 'var(--text-secondary)', maxWidth: 580, margin: '0 auto 48px', lineHeight: 1.65 }}>
            AgroYield Network is Nigeria&apos;s first digital platform connecting students,
            researchers, farmers, agripreneurs, and institutions — grants, mentorship,
            markets, and research, all in one place.
          </p>
          <Countdown />
          <div id="waitlist">
            <WaitlistForm id="hero" />
            <p style={{ fontSize: 13, color: 'var(--text-footer)' }}>Free forever for founding members &nbsp;·&nbsp; No spam, ever.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 40, flexWrap: 'wrap' as const }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>🇳🇬 Built for Nigeria</span>
            <span style={{ width: 4, height: 4, background: 'var(--text-footer)', borderRadius: '50%', display: 'inline-block' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>🌍 Open to all of Africa</span>
            <span style={{ width: 4, height: 4, background: 'var(--text-footer)', borderRadius: '50%', display: 'inline-block' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>🔒 Free for founding members</span>
          </div>
        </div>
      </section>

      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, var(--divider), transparent)', margin: '0 24px' }} />

      {/* WHAT IS AGROYIELD */}
      <div className="agy-modules-section" style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--text-accent)', marginBottom: 16 }}>What is AgroYield Network?</p>
        <h2 style={{ fontSize: 'clamp(30px, 4vw, 48px)', fontWeight: 900, letterSpacing: -1.5, color: 'var(--text-primary)', marginBottom: 16, lineHeight: 1.1 }}>
          Everything you need to<br />grow — in one platform.
        </h2>
        <p style={{ fontSize: 17, color: 'var(--text-secondary)', maxWidth: 540, lineHeight: 1.65, marginBottom: 60 }}>
          Six powerful modules built around the real needs of every person in Nigeria&apos;s agricultural value chain.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {modules.map((m) => (
            <div
              key={m.tag}
              className={m.wide ? 'agy-module-wide' : ''}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 22, padding: 32 }}
            >
              <div style={{ width: 52, height: 52, background: 'var(--bg-card-deep)', border: '1px solid var(--border-color)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 20 }}>{m.icon}</div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--text-accent)', marginBottom: 8 }}>{m.tag}</p>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10, letterSpacing: -0.4 }}>{m.name}</h3>
              <p style={{ fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{m.desc}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8, marginTop: 18 }}>
                {m.pills.map(p => (
                  <span key={p} style={{ fontSize: 12, fontWeight: 600, color: 'var(--pill-text)', background: 'var(--pill-bg)', border: '1px solid var(--pill-border)', borderRadius: 100, padding: '4px 12px' }}>{p}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, var(--divider), transparent)', margin: '0 24px' }} />

      {/* BOTTOM CTA */}
      <div className="agy-cta-section" style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, background: 'radial-gradient(ellipse at center, rgba(34,197,94,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, letterSpacing: -1.5, color: 'var(--text-primary)', marginBottom: 16, lineHeight: 1.1 }}>Ready to grow with us?</h2>
        <p style={{ fontSize: 17, color: 'var(--text-secondary)', marginBottom: 40 }}>Be among the first 1,000 founding members when we launch.</p>
        <WaitlistForm id="bottom" />
        <p style={{ fontSize: 13, color: 'var(--text-footer)' }}>Free forever for founding members &nbsp;·&nbsp; No spam, ever.</p>
      </div>

      {/* FOOTER */}
      <footer className="agy-footer" style={{ borderTop: '1px solid var(--border-color)', position: 'relative', zIndex: 1 }}>
        <p style={{ fontSize: 13, color: 'var(--text-footer)' }}>© 2026 AgroYield Network. All rights reserved.</p>
        <div className="agy-footer-links">
          {['Contact', 'Privacy', 'About', 'Twitter / X', 'LinkedIn'].map(link => (
            <a key={link}
              href={link === 'Contact' ? '/contact' : link === 'About' ? '/about' : link === 'Privacy' ? '/privacy' : '#'}
              style={{ fontSize: 13, color: 'var(--text-footer)', textDecoration: 'none' }}
            >{link}</a>
          ))}
        </div>
      </footer>
    </main>
  )
}
