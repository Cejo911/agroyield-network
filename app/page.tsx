'use client'
import { useState, useEffect } from 'react'

function Countdown() {
  const LAUNCH = new Date('2026-07-05T00:00:00')

  const calc = () => {
    const diff = LAUNCH.getTime() - Date.now()
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
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
    { label: 'Days', value: time.days, raw: true },
    { label: 'Hours', value: time.hours, raw: false },
    { label: 'Minutes', value: time.minutes, raw: false },
    { label: 'Seconds', value: time.seconds, raw: false },
  ]

  return (
    <div style={{ margin: '0 auto 44px', textAlign: 'center' }}>
      <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4b7a5c', marginBottom: 18 }}>
        Platform launches in
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        {units.map(({ label, value, raw }) => (
          <div key={label} style={{ background: '#0c1c11', border: '1px solid #1c3825', borderRadius: 16, padding: '18px 22px', minWidth: 76, textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, color: '#22c55e', letterSpacing: -1, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {raw ? String(value) : pad(value)}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#4b7a5c', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 8 }}>
              {label}
            </div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 13, color: '#4b7a5c', marginTop: 14 }}>
        Launching <strong style={{ color: '#6ee7b7' }}>5 July 2026</strong> — join the waitlist to get early access
      </p>
    </div>
  )
}

function WaitlistForm({ id }: { id: string }) {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

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
      <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 14, padding: '24px 32px', maxWidth: 420, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🌱</div>
        <h3 style={{ color: '#4ade80', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>You&apos;re on the list!</h3>
        <p style={{ color: '#bbf7d0', fontSize: 14 }}>Check your inbox — we&apos;ve sent you a confirmation. Tell a friend who&apos;s in agriculture!</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 12, maxWidth: 520, margin: '0 auto 16px', flexWrap: 'wrap', justifyContent: 'center' }}>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Enter your email address"
        required
        style={{
          flex: 1, minWidth: 240, padding: '15px 20px', fontSize: 15,
          background: '#0c1c11', border: error ? '1.5px solid #ef4444' : '1.5px solid #1c3825',
          borderRadius: 12, color: '#f0fdf4', outline: 'none', fontFamily: 'inherit'
        }}
      />
      <button
        type="submit"
        disabled={loading}
        style={{
          padding: '15px 28px', fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
          color: '#030a05', background: 'linear-gradient(135deg, #22c55e, #16a34a)',
          border: 'none', borderRadius: 12, cursor: 'pointer', whiteSpace: 'nowrap',
          boxShadow: '0 4px 20px rgba(34,197,94,0.3)', opacity: loading ? 0.6 : 1
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
    pills: ['Messaging', 'Network Feed', 'Polls & Articles', 'Market Flash']
  },
  {
    icon: '🎯', tag: 'Module 02', name: 'Opportunities', wide: false,
    desc: "Grants, events, and mentorship in one dashboard. Get alerted before deadlines, find mentors who've walked your path, and register for agri conferences — all without the endless email lists.",
    pills: ['Grants & Funding', 'Events', 'Mentorship']
  },
  {
    icon: '📊', tag: 'Module 03', name: 'Price Tracker', wide: false,
    desc: 'Real-time commodity prices across Nigerian markets — from Mile 12 to Bodija. Set price alerts for your crops and never sell below market rate again.',
    pills: ['Live Prices', 'Price Alerts', 'Market History']
  },
  {
    icon: '🛒', tag: 'Module 04', name: 'Marketplace', wide: false,
    desc: 'List your produce, equipment, seeds, and agri-inputs. Connect directly with verified buyers and sellers across Nigeria — no middlemen, no market commissions.',
    pills: ['Produce Listings', 'Equipment', 'Direct Inquiries']
  },
  {
    icon: '📚', tag: 'Module 05', name: 'Research Board', wide: false,
    desc: 'Publish papers, join open collaborations, and build your academic profile. For researchers who want their work to reach the farmers who need it most.',
    pills: ['Paper Repository', 'Collaborations', 'Citation Tracking']
  },
]

export default function Home() {
  return (
    <main id="top" style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#060d09', color: '#f0fdf4', minHeight: '100vh', lineHeight: 1.6 }}>
      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', background: 'rgba(6,13,9,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(34,197,94,0.08)' }}>
        <a href="#top" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg, #16a34a, #22c55e)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>🌾</div>
          <span style={{ fontSize: 17, fontWeight: 800, color: '#f0fdf4', letterSpacing: '-0.3px' }}>Agro<span style={{ color: '#22c55e' }}>Yield</span></span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <a href="/about" style={{ fontSize: 13, fontWeight: 600, color: '#bbf7d0', textDecoration: 'none' }}>About</a>
          <a href="/contact" style={{ fontSize: 13, fontWeight: 600, color: '#bbf7d0', textDecoration: 'none' }}>Contact</a>
          <a href="#top" style={{ fontSize: 13, fontWeight: 600, color: '#22c55e', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 100, padding: '6px 16px', textDecoration: 'none' }}>
            Join Waitlist
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section id="top-section" style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '120px 24px 80px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(34,197,94,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.04) 1px, transparent 1px)', backgroundSize: '64px 64px', maskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, black 40%, transparent 100%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 700, height: 500, background: 'radial-gradient(ellipse at center, rgba(34,197,94,0.13) 0%, rgba(34,197,94,0.04) 50%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 780 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#22c55e', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 100, padding: '7px 16px', marginBottom: 36 }}>
            <span style={{ width: 7, height: 7, background: '#22c55e', borderRadius: '50%', display: 'inline-block' }} />
            Now Building — Join the Founding Members
          </div>
          <h1 style={{ fontSize: 'clamp(40px, 6.5vw, 76px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: -2, color: '#f0fdf4', marginBottom: 24 }}>
            Agriculture is a<br />
            <span style={{ background: 'linear-gradient(90deg, #22c55e, #4ade80)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Business.</span><br />
            Build Yours.
          </h1>
          <p style={{ fontSize: 'clamp(17px, 2vw, 20px)', color: '#bbf7d0', maxWidth: 580, margin: '0 auto 48px', lineHeight: 1.65 }}>
            AgroYield Network is Nigeria&apos;s first digital platform connecting students,
            researchers, farmers, agripreneurs, and institutions — grants, mentorship,
            markets, and research, all in one place.
          </p>

          {/* COUNTDOWN */}
          <Countdown />

          <div id="waitlist">
            <WaitlistForm id="hero" />
            <p style={{ fontSize: 13, color: '#4b7a5c' }}>Free forever for founding members &nbsp;·&nbsp; No spam, ever.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 40, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#6ee7b7' }}>🇳🇬 Built for Nigeria</span>
            <span style={{ width: 4, height: 4, background: '#4b7a5c', borderRadius: '50%', display: 'inline-block' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#6ee7b7' }}>🌍 Open to all of Africa</span>
            <span style={{ width: 4, height: 4, background: '#4b7a5c', borderRadius: '50%', display: 'inline-block' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#6ee7b7' }}>🔒 Free for founding members</span>
          </div>
        </div>
      </section>

      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #1c3825, transparent)', margin: '0 24px' }} />

      {/* WHAT IS AGROYIELD */}
      <div style={{ position: 'relative', zIndex: 1, padding: '100px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#22c55e', marginBottom: 16 }}>What is AgroYield Network?</p>
        <h2 style={{ fontSize: 'clamp(30px, 4vw, 48px)', fontWeight: 900, letterSpacing: -1.5, color: '#f0fdf4', marginBottom: 16, lineHeight: 1.1 }}>Everything you need to<br />grow — in one platform.</h2>
        <p style={{ fontSize: 17, color: '#bbf7d0', maxWidth: 540, lineHeight: 1.65, marginBottom: 60 }}>
          Five powerful modules built around the real needs of every person in Nigeria&apos;s agricultural value chain.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {modules.map((m) => (
            <div key={m.tag} style={{ gridColumn: m.wide ? 'span 2' : 'span 1', background: '#0c1c11', border: '1px solid #1c3825', borderRadius: 22, padding: 32 }}>
              <div style={{ width: 52, height: 52, background: '#0f2318', border: '1px solid #1c3825', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 20 }}>{m.icon}</div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#22c55e', marginBottom: 8 }}>{m.tag}</p>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: '#f0fdf4', marginBottom: 10, letterSpacing: -0.4 }}>{m.name}</h3>
              <p style={{ fontSize: 14.5, color: '#bbf7d0', lineHeight: 1.65 }}>{m.desc}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
                {m.pills.map(p => (
                  <span key={p} style={{ fontSize: 12, fontWeight: 600, color: '#6ee7b7', background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.12)', borderRadius: 100, padding: '4px 12px' }}>{p}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #1c3825, transparent)', margin: '0 24px' }} />

      {/* BOTTOM CTA */}
      <div style={{ textAlign: 'center', padding: '100px 24px 120px', position: 'relative', zIndex: 1 }}>
        <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, background: 'radial-gradient(ellipse at center, rgba(34,197,94,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, letterSpacing: -1.5, color: '#f0fdf4', marginBottom: 16, lineHeight: 1.1 }}>Ready to grow with us?</h2>
        <p style={{ fontSize: 17, color: '#bbf7d0', marginBottom: 40 }}>Be among the first 1,000 founding members when we launch.</p>
        <WaitlistForm id="bottom" />
        <p style={{ fontSize: 13, color: '#4b7a5c' }}>Free forever for founding members &nbsp;·&nbsp; No spam, ever.</p>
      </div>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid #1c3825', padding: '28px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, position: 'relative', zIndex: 1 }}>
        <p style={{ fontSize: 13, color: '#4b7a5c' }}>© 2026 AgroYield Network. All rights reserved.</p>
        <div style={{ display: 'flex', gap: 24 }}>
          {['Contact', 'Privacy', 'About', 'Twitter / X', 'LinkedIn'].map(link => (
            <a key={link}
              href={link === 'Contact' ? '/contact' : link === 'About' ? '/about' : '#'}
              style={{ fontSize: 13, color: '#4b7a5c', textDecoration: 'none' }}>{link}</a>
          ))}
        </div>
      </footer>
    </main>
  )
}
