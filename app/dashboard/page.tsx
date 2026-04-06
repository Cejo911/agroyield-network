import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function Dashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <main style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#060d09', color: '#f0fdf4', minHeight: '100vh' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', borderBottom: '1px solid rgba(34,197,94,0.08)' }}>
        <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg, #16a34a, #22c55e)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>🌾</div>
          <span style={{ fontSize: 17, fontWeight: 800, color: '#f0fdf4', letterSpacing: '-0.3px' }}>Agro<span style={{ color: '#22c55e' }}>Yield</span></span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <span style={{ fontSize: 13, color: '#6ee7b7' }}>{user.email}</span>
          <form action="/auth/signout" method="post">
            <button type="submit" style={{ fontSize: 13, fontWeight: 600, color: '#ef4444', background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 100, padding: '6px 16px', cursor: 'pointer', fontFamily: 'inherit' }}>
              Sign out
            </button>
          </form>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px' }}>
        <div style={{ marginBottom: 48 }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#22c55e', marginBottom: 12 }}>Welcome back</p>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, color: '#f0fdf4', letterSpacing: -1.5, marginBottom: 12 }}>Your Dashboard</h1>
          <p style={{ fontSize: 16, color: '#bbf7d0' }}>The full platform is being built. Here&apos;s what&apos;s coming.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {[
            { icon: '🤝', name: 'Connections', desc: 'Connect with researchers, farmers, and agripreneurs across Africa.', status: 'Coming soon' },
            { icon: '🎯', name: 'Opportunities', desc: 'Grants, events, and mentorship — all in one place.', status: 'Coming soon' },
            { icon: '📊', name: 'Price Tracker', desc: 'Live commodity prices across Nigerian markets.', status: 'Coming soon' },
            { icon: '🛒', name: 'Marketplace', desc: 'Buy and sell produce, equipment, and agri-inputs.', status: 'Coming soon' },
            { icon: '📚', name: 'Research Board', desc: 'Publish papers and join open collaborations.', status: 'Coming soon' },
          ].map(module => (
            <div key={module.name} style={{ background: '#0c1c11', border: '1px solid #1c3825', borderRadius: 20, padding: 28 }}>
              <div style={{ fontSize: 28, marginBottom: 16 }}>{module.icon}</div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: '#f0fdf4', marginBottom: 8 }}>{module.name}</h3>
              <p style={{ fontSize: 14, color: '#bbf7d0', lineHeight: 1.65, marginBottom: 16 }}>{module.desc}</p>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#22c55e', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 100, padding: '4px 12px' }}>{module.status}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
