'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#060d09', color: '#f0fdf4', minHeight: '100vh', lineHeight: 1.6, display: 'flex', flexDirection: 'column' }}>

      <style>{`
        .agy-nav { padding: 20px 40px; }
        @media (max-width: 768px) { .agy-nav { padding: 16px 20px; } }
      `}</style>

      {/* NAV */}
      <nav className="agy-nav" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(34,197,94,0.08)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <Image src="/logo-icon-white.png" alt="AgroYield Network" width={34} height={34} style={{ display: 'block' }} />
          <span style={{ fontSize: 17, fontWeight: 800, color: '#f0fdf4', letterSpacing: '-0.3px' }}>Agro<span style={{ color: '#22c55e' }}>Yield</span></span>
        </Link>
      </nav>

      {/* CONTENT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '60px 24px', position: 'relative', overflow: 'hidden' }}>

        {/* Background grid */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(34,197,94,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.04) 1px, transparent 1px)', backgroundSize: '64px 64px', maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 40%, transparent 100%)', pointerEvents: 'none' }} />

        {/* Glow */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 500, height: 500, background: 'radial-gradient(ellipse at center, rgba(239,68,68,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 560 }}>

          {/* Icon */}
          <div style={{ fontSize: 64, marginBottom: 24 }}>⚠️</div>

          {/* Label */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#f87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 100, padding: '6px 16px', marginBottom: 28 }}>
            <span style={{ width: 6, height: 6, background: '#f87171', borderRadius: '50%', display: 'inline-block' }} />
            Something went wrong
          </div>

          <h1 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, letterSpacing: -1, color: '#f0fdf4', marginBottom: 16, lineHeight: 1.15 }}>
            An unexpected error occurred.
          </h1>

          <p style={{ fontSize: 16, color: '#bbf7d0', lineHeight: 1.75, marginBottom: 40 }}>
            Something on our end went wrong. You can try again or head back to the dashboard. If this keeps happening, contact us at{' '}
            <a href="mailto:hello@agroyield.africa" style={{ color: '#22c55e', textDecoration: 'none' }}>hello@agroyield.africa</a>.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={reset}
              style={{ display: 'inline-block', padding: '13px 28px', fontSize: 14, fontWeight: 700, color: '#030a05', background: 'linear-gradient(135deg, #22c55e, #16a34a)', borderRadius: 10, border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(34,197,94,0.25)', fontFamily: 'inherit' }}
            >
              Try Again
            </button>
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
        <p style={{ fontSize: 10, color: '#4b7a5c', opacity: 0.6, margin: '4px 0 0' }}>An Agcoms International Project</p>
      </footer>

    </main>
  )
}
