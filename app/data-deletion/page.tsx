'use client'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import ThemeToggle from '@/app/components/ThemeToggle'

function DataDeletionContent() {
  const searchParams = useSearchParams()
  const code = searchParams.get('code')

  return (
    <main style={{ fontFamily: "'Inter', system-ui, sans-serif", background: 'var(--bg-page)', color: 'var(--text-primary)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        :root {
          --bg-page: #f9fafb; --nav-border: rgba(0,0,0,0.06); --bg-card: #ffffff;
          --border-color: #e5e7eb; --text-primary: #111827; --text-secondary: #374151;
          --text-muted: #6b7280; --text-accent: #16a34a;
        }
        .dark {
          --bg-page: #060d09; --nav-border: rgba(34,197,94,0.08); --bg-card: #0c1c11;
          --border-color: #1c3825; --text-primary: #f0fdf4; --text-secondary: #bbf7d0;
          --text-muted: #4b7a5c; --text-accent: #22c55e;
        }
        .auth-logo-colored { display: block; }
        .auth-logo-white   { display: none; }
        .dark .auth-logo-colored { display: none; }
        .dark .auth-logo-white   { display: block; }
      `}</style>

      {/* NAV */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', borderBottom: '1px solid var(--nav-border)' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src="/logo-horizontal-colored.png" alt="AgroYield Network" className="auth-logo-colored" style={{ height: 58, width: 'auto' }} />
          <img src="/logo-horizontal-white.png"   alt="AgroYield Network" className="auth-logo-white"   style={{ height: 58, width: 'auto' }} />
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <ThemeToggle />
          <a href="/" style={{ fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}>← Back to home</a>
        </div>
      </nav>

      {/* CONTENT */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '60px 24px' }}>
        <div style={{ width: '100%', maxWidth: 640 }}>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: -1, marginBottom: 16 }}>Data Deletion</h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 40 }}>Last updated: April 11, 2026</p>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 20, padding: '36px 32px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

              {/* Show confirmation status if user arrived via Facebook deletion callback */}
              {code && (
                <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 12, padding: '20px 24px' }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-accent)', marginBottom: 8 }}>Deletion request received</h2>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: '0 0 8px 0' }}>
                    Your data deletion request has been submitted and is being processed. Your data will be permanently removed within 30 days.
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                    Confirmation code: <strong style={{ color: 'var(--text-primary)' }}>{code}</strong>
                  </p>
                </div>
              )}

              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>Your data, your choice</h2>
                <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.8, margin: 0 }}>
                  AgroYield Network respects your right to control your personal data. Whether you signed up using email, Google, LinkedIn, or Facebook, you can request complete deletion of your account and all associated data at any time.
                </p>
              </div>

              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>How to request data deletion</h2>
                <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.8, margin: 0 }}>
                  Send an email to <a href="mailto:hello@agroyield.africa" style={{ color: 'var(--text-accent)', textDecoration: 'none', fontWeight: 600 }}>hello@agroyield.africa</a> with the subject line <strong style={{ color: 'var(--text-primary)' }}>"Data Deletion Request"</strong> and include the email address associated with your account. We will process your request within 30 days.
                </p>
              </div>

              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>What gets deleted</h2>
                <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.8, margin: 0 }}>
                  Upon processing your request, we will permanently delete your profile information, posts, connections, business data, and any other personal data stored on AgroYield Network. This action is irreversible.
                </p>
              </div>

              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>Revoking third-party permissions</h2>
                <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.8, margin: 0 }}>
                  You can also revoke AgroYield Network's access to your third-party account data at any time:
                </p>
                <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 2.2, margin: '12px 0 0 0' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Facebook:</strong> Settings → Apps and Websites → find AgroYield Networks → Remove<br />
                  <strong style={{ color: 'var(--text-primary)' }}>Google:</strong> myaccount.google.com → Security → Third-party apps → find AgroYield Networks → Remove access<br />
                  <strong style={{ color: 'var(--text-primary)' }}>LinkedIn:</strong> Settings → Data privacy → Other applications → find AgroYield Networks → Remove
                </p>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 24 }}>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7, margin: 0 }}>
                  If you have any questions about our data practices, please refer to our <a href="/privacy" style={{ color: 'var(--text-accent)', textDecoration: 'none', fontWeight: 600 }}>Privacy Policy</a> or contact us at <a href="mailto:hello@agroyield.africa" style={{ color: 'var(--text-accent)', textDecoration: 'none', fontWeight: 600 }}>hello@agroyield.africa</a>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function DataDeletion() {
  return (
    <Suspense fallback={null}>
      <DataDeletionContent />
    </Suspense>
  )
}
