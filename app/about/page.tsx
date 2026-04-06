export default function About() {
  const advisors = [
    { name: 'Dr. Amina Okafor', role: 'Agricultural Economics, University of Ibadan', flag: '🇳🇬' },
    { name: 'Prof. Kwame Asante', role: 'Agri-Tech Innovation, KNUST Ghana', flag: '🇬🇭' },
    { name: 'Fatima Al-Hassan', role: 'Rural Finance & Impact Investing', flag: '🇸🇳' },
    { name: 'Dr. Emeka Nwosu', role: 'Food Systems & Policy, AU Commission', flag: '🌍' },
    { name: 'Yetunde Adeyemi', role: 'AgriTech Entrepreneurship, Lagos', flag: '🇳🇬' },
    { name: 'Prof. Sadia Mbaye', role: 'Soil Science & Climate Resilience', flag: '🇸🇳' },
  ]

  return (
    <main style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#060d09', color: '#f0fdf4', minHeight: '100vh', lineHeight: 1.6 }}>

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', background: 'rgba(6,13,9,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(34,197,94,0.08)' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg, #16a34a, #22c55e)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>🌾</div>
          <span style={{ fontSize: 17, fontWeight: 800, color: '#f0fdf4', letterSpacing: '-0.3px' }}>Agro<span style={{ color: '#22c55e' }}>Yield</span></span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <a href="/about" style={{ fontSize: 13, fontWeight: 600, color: '#22c55e', textDecoration: 'none' }}>About</a>
          <a href="/contact" style={{ fontSize: 13, fontWeight: 600, color: '#bbf7d0', textDecoration: 'none' }}>Contact</a>
          <a href="/" style={{ fontSize: 13, fontWeight: 600, color: '#22c55e', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 100, padding: '6px 16px', textDecoration: 'none' }}>
            Join Waitlist
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ position: 'relative', paddingTop: 160, paddingBottom: 100, paddingLeft: 24, paddingRight: 24, textAlign: 'center', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(34,197,94,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.04) 1px, transparent 1px)', backgroundSize: '64px 64px', maskImage: 'radial-gradient(ellipse 70% 60% at 50% 30%, black 40%, transparent 100%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 700, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#22c55e', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 100, padding: '7px 16px', marginBottom: 36 }}>
            <span style={{ width: 7, height: 7, background: '#22c55e', borderRadius: '50%', display: 'inline-block' }} />
            Our Story
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 5.5vw, 64px)', fontWeight: 900, lineHeight: 1.08, letterSpacing: -2, color: '#f0fdf4', marginBottom: 24 }}>
            We believe agriculture<br />
            <span style={{ background: 'linear-gradient(90deg, #22c55e, #4ade80)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>is Africa&apos;s greatest opportunity.</span>
          </h1>
          <p style={{ fontSize: 18, color: '#bbf7d0', maxWidth: 560, margin: '0 auto', lineHeight: 1.7 }}>
            AgroYield Network was built to give every student, researcher, farmer, and agripreneur in Nigeria and across Africa the connections, tools, and knowledge to turn that belief into results.
          </p>
        </div>
      </section>

      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #1c3825, transparent)', margin: '0 40px' }} />

      {/* MISSION & VISION */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '100px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          <div style={{ background: '#0c1c11', border: '1px solid #1c3825', borderRadius: 24, padding: '48px 40px' }}>
            <div style={{ width: 52, height: 52, background: 'linear-gradient(135deg, #16a34a22, #22c55e22)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: 28 }}>🎯</div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#22c55e', marginBottom: 12 }}>Our Mission</p>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: '#f0fdf4', lineHeight: 1.2, letterSpacing: -0.5, marginBottom: 16 }}>Connect every mind working to feed Africa.</h2>
            <p style={{ fontSize: 15, color: '#bbf7d0', lineHeight: 1.75 }}>
              We are building the infrastructure that agriculture&apos;s brightest minds have always needed but never had — a single platform where knowledge flows freely, opportunities are visible to everyone, and collaboration happens across borders without friction.
            </p>
          </div>

          <div style={{ background: '#0c1c11', border: '1px solid #1c3825', borderRadius: 24, padding: '48px 40px' }}>
            <div style={{ width: 52, height: 52, background: 'linear-gradient(135deg, #16a34a22, #22c55e22)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: 28 }}>🌍</div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#22c55e', marginBottom: 12 }}>Our Vision</p>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: '#f0fdf4', lineHeight: 1.2, letterSpacing: -0.5, marginBottom: 16 }}>An Africa that feeds itself — and the world.</h2>
            <p style={{ fontSize: 15, color: '#bbf7d0', lineHeight: 1.75 }}>
              By 2030, we envision AgroYield Network as the default professional home for one million agricultural minds across Africa — the place where careers are built, research reaches farmers, grants are discovered, and the next generation of agripreneurs finds its footing.
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 1, marginTop: 24, border: '1px solid #1c3825', borderRadius: 20, overflow: 'hidden', background: '#1c3825' }}>
          {[
            { value: '54', label: 'African countries we aim to serve' },
            { value: '5', label: 'Platform modules at launch' },
            { value: '1M+', label: 'Target members by 2030' },
            { value: '2026', label: 'Year we launch' },
          ].map(stat => (
            <div key={stat.label} style={{ background: '#0c1c11', padding: '36px 32px', textAlign: 'center' }}>
              <p style={{ fontSize: 42, fontWeight: 900, color: '#22c55e', letterSpacing: -2, marginBottom: 8 }}>{stat.value}</p>
              <p style={{ fontSize: 13, color: '#6ee7b7', lineHeight: 1.5 }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #1c3825, transparent)', margin: '0 40px' }} />

      {/* THE STORY */}
      <section style={{ maxWidth: 760, margin: '0 auto', padding: '100px 24px' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#22c55e', marginBottom: 16 }}>How it started</p>
        <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 42px)', fontWeight: 900, letterSpacing: -1.5, color: '#f0fdf4', marginBottom: 40, lineHeight: 1.15 }}>
          Born from a frustration<br />every agri student knows.
        </h2>

        {[
          {
            year: '2023',
            text: `It started with a question that had no good answer: where do agricultural engineering students in Nigeria go to find each other, share research, discover grants, or connect with the people actually working in the field? The answer was nowhere — or everywhere and nowhere at once. LinkedIn was built for tech. WhatsApp groups were chaotic. Academic portals were locked behind institutional walls.`
          },
          {
            year: '2024',
            text: `The idea for AgroYield Network took shape around a simple conviction: that agriculture — Nigeria's largest employer, Africa's greatest economic lever — deserved its own professional network. One built with the realities of the sector in mind. Slow internet. Limited data. Researchers who can't reach farmers. Farmers who can't find funding. Students who graduate with no professional community to plug into.`
          },
          {
            year: '2025',
            text: `Design and development began. Five core modules were scoped: Connections & Insights, Opportunities (grants, mentorship, events), a live Price Tracker, a Marketplace, and a Research Board. The goal was not to build another app — but to build infrastructure. The kind that lasts because it's genuinely useful to the people on the ground.`
          },
          {
            year: '2026 →',
            text: `AgroYield Network is now in its final build phase. The waitlist is open. Founding members are being added every day. We're recruiting advisors, engineering the database, and preparing for a beta launch later this year. If you're here — you're early. And we're grateful.`
          },
        ].map((item, i) => (
          <div key={item.year} style={{ display: 'flex', gap: 32, marginBottom: i < 3 ? 48 : 0 }}>
            <div style={{ flexShrink: 0, width: 64 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 100, padding: '4px 10px', whiteSpace: 'nowrap' }}>{item.year}</span>
              {i < 3 && <div style={{ width: 1, background: '#1c3825', height: 'calc(100% + 32px)', margin: '12px auto 0', display: 'block' }} />}
            </div>
            <p style={{ fontSize: 16, color: '#bbf7d0', lineHeight: 1.8, paddingTop: 2 }}>{item.text}</p>
          </div>
        ))}
      </section>

      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #1c3825, transparent)', margin: '0 40px' }} />

      {/* ADVISORS */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '100px 24px' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#22c55e', marginBottom: 16 }}>Advisory Board</p>
        <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 42px)', fontWeight: 900, letterSpacing: -1.5, color: '#f0fdf4', marginBottom: 16, lineHeight: 1.15 }}>Guided by practitioners<br />who&apos;ve done the work.</h2>
        <p style={{ fontSize: 16, color: '#bbf7d0', maxWidth: 480, lineHeight: 1.7, marginBottom: 56 }}>
          Our advisors bring decades of experience across agri-research, rural finance, agritech entrepreneurship, and food policy across Africa.
        </p>

        <div style={{ background: '#0c1c11', border: '1px solid #1c3825', borderRadius: 20, padding: '56px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 20 }}>🌿</div>
          <h3 style={{ fontSize: 22, fontWeight: 800, color: '#f0fdf4', letterSpacing: -0.5, marginBottom: 12 }}>Advisory board to be revealed soon</h3>
          <p style={{ fontSize: 15, color: '#bbf7d0', maxWidth: 440, margin: '0 auto', lineHeight: 1.75 }}>
            We are assembling a world-class group of advisors from across Africa&apos;s agricultural, research, and investment communities. Stay tuned.
          </p>
        </div>
      </section>

      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #1c3825, transparent)', margin: '0 40px' }} />

      {/* BOTTOM CTA */}
      <div style={{ textAlign: 'center', padding: '80px 24px 100px' }}>
        <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 42px)', fontWeight: 900, letterSpacing: -1.5, color: '#f0fdf4', marginBottom: 14, lineHeight: 1.1 }}>Want to be part of this?</h2>
        <p style={{ fontSize: 16, color: '#bbf7d0', marginBottom: 32 }}>Join the waitlist. We&apos;re saving a spot for you.</p>
        <a href="/" style={{ display: 'inline-block', padding: '16px 36px', fontSize: 15, fontWeight: 700, color: '#030a05', background: 'linear-gradient(135deg, #22c55e, #16a34a)', borderRadius: 12, textDecoration: 'none', boxShadow: '0 4px 20px rgba(34,197,94,0.3)' }}>
          Join the Waitlist →
        </a>
      </div>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid #1c3825', padding: '28px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <p style={{ fontSize: 13, color: '#4b7a5c' }}>© 2026 AgroYield Network. All rights reserved.</p>
        <div style={{ display: 'flex', gap: 24 }}>
          {['Contact', 'Privacy', 'Twitter / X', 'LinkedIn'].map(link => (
            <a key={link} href={link === 'Contact' ? 'mailto:hello@agroyield.africa' : '#'} style={{ fontSize: 13, color: '#4b7a5c', textDecoration: 'none' }}>{link}</a>
          ))}
        </div>
      </footer>

    </main>
  )
}
