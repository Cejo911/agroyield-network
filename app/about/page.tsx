import type { Metadata } from 'next'
import ThemeToggle from '@/app/components/ThemeToggle'

export const metadata: Metadata = {
  title: 'About',
  description: "Learn about AgroYield Network — Nigeria's first professional platform built entirely for agriculture. Our mission, vision, story, and the team behind the platform.",
  openGraph: {
    title: 'About AgroYield Network',
    description: "Our mission is to connect every mind working to feed Africa. Learn the story behind AgroYield Network and what we're building.",
    url: 'https://agroyield.africa/about',
  },
  twitter: {
    title: 'About AgroYield Network',
    description: "Our mission is to connect every mind working to feed Africa.",
  },
}

export default function About() {
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
          --stat-gap: #e5e7eb;
          --timeline-line: #e5e7eb;
          --icon-bg: rgba(22,163,74,0.08);
          --icon-border: rgba(22,163,74,0.2);
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
          --stat-gap: #1c3825;
          --timeline-line: #1c3825;
          --icon-bg: rgba(22,163,74,0.13);
          --icon-border: rgba(34,197,94,0.2);
        }
        .agy-nav { padding: 20px 40px; }
        .agy-nav-links { display: flex; align-items: center; gap: 20px; }
        .agy-section-lg { padding: 100px 24px; }
        .agy-section-hero { padding-top: 80px; padding-bottom: 100px; padding-left: 24px; padding-right: 24px; }
        .agy-section-cta { padding: 80px 24px 100px; }
        .agy-footer { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; padding: 28px 40px; }
        .agy-footer-links { display: flex; gap: 24px; flex-wrap: wrap; }
        .agy-timeline-item { display: flex; gap: 32px; }
        .agy-timeline-year { flex-shrink: 0; width: 64px; }
        @media (max-width: 768px) {
          .agy-nav { padding: 16px 20px; }
          .agy-nav-links { gap: 10px; }
          .agy-section-lg { padding: 60px 16px; }
          .agy-section-hero { padding-top: 48px; padding-bottom: 60px; padding-left: 16px; padding-right: 16px; }
          .agy-section-cta { padding: 60px 16px 80px; }
          .agy-footer { flex-direction: column; align-items: flex-start; padding: 24px 20px; }
          .agy-footer-links { gap: 16px; }
          .agy-timeline-item { flex-direction: column; gap: 12px; }
          .agy-timeline-year { width: auto; }
          .agy-timeline-line { display: none !important; }
        }
        @media (max-width: 480px) {
          .agy-nav-contact { display: none; }
          .agy-footer-links { gap: 12px; }
        }
      `}</style>

      {/* NAV */}
      <nav className="agy-nav" style={{ position: 'sticky', top: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--nav-bg)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--nav-border)' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg, #16a34a, #22c55e)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>🌾</div>
          <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
            Agro<span style={{ color: 'var(--text-accent)' }}>Yield</span>
          </span>
        </a>
        <div className="agy-nav-links">
          <a href="/about" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-accent)', textDecoration: 'none' }}>About</a>
          <a href="/contact" className="agy-nav-contact" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textDecoration: 'none' }}>Contact</a>
          <ThemeToggle />
          <a href="/" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-accent)', background: 'var(--badge-bg)', border: '1px solid var(--badge-border)', borderRadius: 100, padding: '6px 16px', textDecoration: 'none' }}>
            Join Waitlist
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section className="agy-section-hero" style={{ position: 'relative', textAlign: 'center', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(34,197,94,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.04) 1px, transparent 1px)', backgroundSize: '64px 64px', maskImage: 'radial-gradient(ellipse 70% 60% at 50% 30%, black 40%, transparent 100%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 700, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--text-accent)', background: 'var(--badge-bg)', border: '1px solid var(--badge-border)', borderRadius: 100, padding: '7px 16px', marginBottom: 36 }}>
            <span style={{ width: 7, height: 7, background: 'var(--text-accent)', borderRadius: '50%', display: 'inline-block' }} />
            Our Story
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 5.5vw, 64px)', fontWeight: 900, lineHeight: 1.08, letterSpacing: -2, color: 'var(--text-primary)', marginBottom: 24 }}>
            We believe agriculture<br />
            <span style={{ background: 'linear-gradient(90deg, #22c55e, #4ade80)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              is Africa&apos;s greatest opportunity.
            </span>
          </h1>
          <p style={{ fontSize: 18, color: 'var(--text-secondary)', maxWidth: 560, margin: '0 auto', lineHeight: 1.7 }}>
            AgroYield Network was built to give every student, researcher, farmer, and agripreneur in Nigeria and across Africa the connections, tools, and knowledge to turn that belief into results.
          </p>
        </div>
      </section>

      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, var(--divider), transparent)', margin: '0 24px' }} />

      {/* MISSION & VISION */}
      <section className="agy-section-lg" style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          {[
            {
              icon: '🎯',
              label: 'Our Mission',
              heading: 'Connect every mind working to feed Africa.',
              body: "We are building the infrastructure that agriculture's brightest minds have always needed but never had — a single platform where knowledge flows freely, opportunities are visible to everyone, and collaboration happens across borders without friction.",
            },
            {
              icon: '🌍',
              label: 'Our Vision',
              heading: 'An Africa that feeds itself — and the world.',
              body: 'By 2030, we envision AgroYield Network as the default professional home for ten million agricultural minds across Africa — the place where careers are built, research reaches farmers, grants are discovered, and the next generation of agripreneurs finds its footing.',
            },
          ].map(card => (
            <div key={card.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 24, padding: '48px 40px' }}>
              <div style={{ width: 52, height: 52, background: 'var(--icon-bg)', border: '1px solid var(--icon-border)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: 28 }}>{card.icon}</div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--text-accent)', marginBottom: 12 }}>{card.label}</p>
              <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2, letterSpacing: -0.5, marginBottom: 16 }}>{card.heading}</h2>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.75 }}>{card.body}</p>
            </div>
          ))}
        </div>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 1, marginTop: 24, border: '1px solid var(--border-color)', borderRadius: 20, overflow: 'hidden', background: 'var(--stat-gap)' }}>
          {[
            { value: '54',   label: 'African countries we aim to serve' },
            { value: '5',    label: 'Platform modules at launch' },
            { value: '10M+', label: 'Target members by 2030' },
            { value: '2026', label: 'Year we launch' },
          ].map(stat => (
            <div key={stat.label} style={{ background: 'var(--bg-card)', padding: '36px 32px', textAlign: 'center' }}>
              <p style={{ fontSize: 42, fontWeight: 900, color: 'var(--text-accent)', letterSpacing: -2, marginBottom: 8 }}>{stat.value}</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, var(--divider), transparent)', margin: '0 24px' }} />

      {/* THE STORY */}
      <section className="agy-section-lg" style={{ maxWidth: 760, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--text-accent)', marginBottom: 16 }}>How it started</p>
        <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 42px)', fontWeight: 900, letterSpacing: -1.5, color: 'var(--text-primary)', marginBottom: 40, lineHeight: 1.15 }}>
          Born from a frustration<br />every agri student knows.
        </h2>
        {[
          { year: '2023',   text: "It started with a question that had no good answer: where do agricultural engineering students in Nigeria go to find each other, share research, discover grants, or connect with the people actually working in the field? The answer was nowhere — or everywhere and nowhere at once. LinkedIn was built for tech. WhatsApp groups were chaotic. Academic portals were locked behind institutional walls." },
          { year: '2024',   text: "The idea for AgroYield Network took shape around a simple conviction: that agriculture — Nigeria's largest employer, Africa's greatest economic lever — deserved its own professional network. One built with the realities of the sector in mind. Slow internet. Limited data. Researchers who can't reach farmers. Farmers who can't find funding. Students who graduate with no professional community to plug into." },
          { year: '2025',   text: "Design and development began. Five core modules were scoped: Connections & Insights, Opportunities (grants, mentorship, events), a live Price Tracker, a Marketplace, and a Research Board. The goal was not to build another app — but to build infrastructure. The kind that lasts because it's genuinely useful to the people on the ground." },
          { year: '2026 →', text: "AgroYield Network is now in its final build phase. The waitlist is open. Founding members are being added every day. We're recruiting advisors, engineering the database, and preparing for a beta launch later this year. If you're here — you're early. And we're grateful." },
        ].map((item, i) => (
          <div key={item.year} className="agy-timeline-item" style={{ marginBottom: i < 3 ? 48 : 0 }}>
            <div className="agy-timeline-year">
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-accent)', background: 'var(--badge-bg)', border: '1px solid var(--badge-border)', borderRadius: 100, padding: '4px 10px', whiteSpace: 'nowrap' as const }}>{item.year}</span>
              {i < 3 && <div className="agy-timeline-line" style={{ width: 1, background: 'var(--timeline-line)', height: 'calc(100% + 32px)', margin: '12px auto 0', display: 'block' }} />}
            </div>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.8, paddingTop: 2 }}>{item.text}</p>
          </div>
        ))}
      </section>

      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, var(--divider), transparent)', margin: '0 24px' }} />

      {/* ADVISORS */}
      <section className="agy-section-lg" style={{ maxWidth: 1100, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--text-accent)', marginBottom: 16 }}>Advisory Board</p>
        <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 42px)', fontWeight: 900, letterSpacing: -1.5, color: 'var(--text-primary)', marginBottom: 16, lineHeight: 1.15 }}>
          Guided by practitioners<br />who&apos;ve done the work.
        </h2>
        <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 480, lineHeight: 1.7, marginBottom: 56 }}>
          Our advisors bring decades of experience across agri-research, rural finance, agritech entrepreneurship, and food policy across Africa.
        </p>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 20, padding: '56px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 20 }}>🌿</div>
          <h3 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.5, marginBottom: 12 }}>Advisory board to be revealed soon</h3>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', maxWidth: 440, margin: '0 auto', lineHeight: 1.75 }}>
            We are assembling a world-class group of advisors from across Africa&apos;s agricultural, research, and investment communities. Stay tuned.
          </p>
        </div>
      </section>

      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, var(--divider), transparent)', margin: '0 24px' }} />

      {/* CTA */}
      <div className="agy-section-cta" style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 42px)', fontWeight: 900, letterSpacing: -1.5, color: 'var(--text-primary)', marginBottom: 14, lineHeight: 1.1 }}>Want to be part of this?</h2>
        <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 32 }}>Join the waitlist. We&apos;re saving a spot for you.</p>
        <a href="/" style={{ display: 'inline-block', padding: '16px 36px', fontSize: 15, fontWeight: 700, color: '#030a05', background: 'linear-gradient(135deg, #22c55e, #16a34a)', borderRadius: 12, textDecoration: 'none', boxShadow: '0 4px 20px rgba(34,197,94,0.3)' }}>
          Join the Waitlist →
        </a>
      </div>

      {/* FOOTER */}
      <footer className="agy-footer" style={{ borderTop: '1px solid var(--border-color)' }}>
        <p style={{ fontSize: 13, color: 'var(--text-footer)' }}>© 2026 AgroYield Network. All rights reserved.</p>
        <div className="agy-footer-links">
          {['Contact', 'Privacy', 'Twitter / X', 'LinkedIn'].map(link => (
            <a key={link} href={link === 'Contact' ? 'mailto:hello@agroyield.africa' : '#'} style={{ fontSize: 13, color: 'var(--text-footer)', textDecoration: 'none' }}>{link}</a>
          ))}
        </div>
      </footer>
    </main>
  )
}
