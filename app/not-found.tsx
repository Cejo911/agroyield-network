import Link from 'next/link'

export default function NotFound() {
  return (
    <main style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#060d09', color: '#f0fdf4', minHeight: '100vh', lineHeight: 1.6, display: 'flex', flexDirection: 'column' }}>

      <style>{`
        .agy-nav { padding: 20px 40px; }
        @media (max-width: 768px) { .agy-nav { padding: 16px 20px; } }
      `}</style>

      {/* NAV */}
      <nav className="agy-nav" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(34,197,94,0.08)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg, #16a34a, #22c55e)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>🌾</div>
          <span style={{ fontSize: 17, fontWeight: 800, color: '#f0fdf4', letterSpacing: '-0.3px' }}>Agro<span style={{ color: '#22c55e' }}>Yield</span></span>
        </Link>
      </nav>

      {/* CONTENT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '60px 24px', position: 'relative', overflow: 'hidden' }}>

        {/* Background grid */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(34,197,94,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.04) 1px, transparent 1px)', backgroundSize: '64px 64px', maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 40%, transparent 100%)', pointerEvents: 'none' }} />

        {/* Glow */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 500, height: 500, background: 'radial-gradient(ellipse at center, rgba(34,197,94,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 560 }}>

          {/* 404 number */}
          <p style={{ fontSize: 'clamp(96px, 20vw, 160px)', fontWeight: 900, lineHeight: 1, letterSpacing: -6, margin: '0 0 8px', background: 'linear-gradient(135deg, #1c3825, #22c55e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            404
          </p>

          {/* Label */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#22c55e', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 100, padding: '6px 16px', marginBottom: 28 }}>
            <span style={{ width: 6, height: 6, background: '#22c55e', borderRadius: '50%', display: 'inline-block' }} />
            Page not found
          </div>

          <h1 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, letterSpacing: -1, color: '#f0fdf4', marginBottom: 16, lineHeight: 1.15 }}>
            This field hasn&apos;t been planted yet.
          </h1>

          <p style={{ fontSize: 16, color: '#bbf7d0', lineHeight: 1.75, marginBottom: 40 }}>
            The page you&apos;re looking for doesn&apos;t exist or may have been moved. Let&apos;s get you back to somewhere useful.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/"
              style={{ display: 'inline-block', padding: '13px 28px', fontSize: 14, fontWeight: 700, color: '#030a05', background: 'linear-gradient(135deg, #22c55e, #16a34a)', borderRadius: 10, textDecoration: 'none', boxShadow: '0 4px 20px rgba(34,197,94,0.25)' }}
            >
              Go Home →
            </Link>
            <Link
              href="/dashboard"
              style={{ display: 'inline-block', padding: '13px 28px', fontSize: 14, fontWeight: 700, color: '#6ee7b7', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, textDecoration: 'none' }}
            >
              Go to Dashboard
            </Link>
          </div>

        </div>
      </div>

      {/* FOOTER */}
      <footer style={{ padding: '20px 40px', borderTop: '1px solid #1c3825', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: '#4b7a5c', margin: 0 }}>© 2026 AgroYield Network · Nigeria</p>
      </footer>

    </main>
  )
}
