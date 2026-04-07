export default function PrivacyPolicy() {
  return (
    <main style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#060d09', color: '#f0fdf4', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* NAV */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', borderBottom: '1px solid rgba(34,197,94,0.08)' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg, #16a34a, #22c55e)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>🌾</div>
          <span style={{ fontSize: 17, fontWeight: 800, color: '#f0fdf4', letterSpacing: '-0.3px' }}>Agro<span style={{ color: '#22c55e' }}>Yield</span></span>
        </a>
        <a href="/" style={{ fontSize: 13, color: '#bbf7d0', textDecoration: 'none' }}>← Back to home</a>
      </nav>

      {/* CONTENT */}
      <div style={{ flex: 1, maxWidth: 760, margin: '0 auto', padding: '60px 24px' }}>
        <h1 style={{ fontSize: 36, fontWeight: 900, color: '#f0fdf4', letterSpacing: -1, marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ fontSize: 14, color: '#4b7a5c', marginBottom: 48 }}>Last updated: April 7, 2026</p>

        {[
          {
            title: '1. Introduction',
            body: `AgroYield Network ("we", "our", or "us") operates agroyield.africa, Nigeria's first digital platform connecting agricultural students, researchers, farmers, and agripreneurs. This Privacy Policy explains how we collect, use, and protect your personal information when you use our platform.`,
          },
          {
            title: '2. Information We Collect',
            body: `We collect information you provide directly when you create an account, including your name, email address, role, institution or organisation, location, bio, profile photo, and areas of interest. We also collect information you choose to add to your profile such as LinkedIn, Twitter/X, and personal website links. When you use the platform, we may collect usage data such as pages visited and features used to improve our service.`,
          },
          {
            title: '3. How We Use Your Information',
            body: `We use your information to operate and provide the AgroYield Network platform, display your profile to other members, send you account-related emails such as signup confirmation and weekly digest updates, personalise your experience on the platform, and improve our features and services. We do not sell your personal data to third parties.`,
          },
          {
            title: '4. Third-Party Services',
            body: `We use the following third-party services to operate the platform: Supabase for database storage and authentication, Google OAuth for sign-in with Google, Resend for transactional and digest emails, and Vercel for hosting. Each of these providers has their own privacy policy governing the data they process on our behalf.`,
          },
          {
            title: '5. Data Sharing',
            body: `Your profile information — including your name, role, institution, bio, and areas of interest — is visible to other registered members of AgroYield Network. Your email address is never displayed publicly. We do not share your personal information with advertisers or unaffiliated third parties.`,
          },
          {
            title: '6. Data Security',
            body: `We take reasonable measures to protect your personal information, including encrypted data transmission, secure authentication, and access controls. However, no method of transmission over the internet is completely secure, and we cannot guarantee absolute security.`,
          },
          {
            title: '7. Your Rights',
            body: `You have the right to access the personal information we hold about you, update or correct your information at any time through your profile settings, request deletion of your account and associated data, and opt out of non-essential communications. To exercise any of these rights, contact us at hello@agroyield.africa.`,
          },
          {
            title: '8. Cookies',
            body: `We use cookies and similar technologies to maintain your login session and remember your preferences. These are essential for the platform to function. We do not use cookies for advertising or cross-site tracking.`,
          },
          {
            title: '9. Children\'s Privacy',
            body: `AgroYield Network is not directed at children under the age of 13. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us and we will delete it promptly.`,
          },
          {
            title: '10. Changes to This Policy',
            body: `We may update this Privacy Policy from time to time. When we do, we will update the date at the top of this page. Continued use of the platform after changes constitutes acceptance of the updated policy.`,
          },
          {
            title: '11. Contact Us',
            body: `If you have any questions about this Privacy Policy, please contact us at hello@agroyield.africa or write to AgroYield Network, Nigeria.`,
          },
        ].map(section => (
          <div key={section.title} style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#22c55e', marginBottom: 12 }}>{section.title}</h2>
            <p style={{ fontSize: 15, color: '#bbf7d0', lineHeight: 1.8, margin: 0 }}>{section.body}</p>
          </div>
        ))}
      </div>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid rgba(34,197,94,0.08)', padding: '24px 40px', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: '#4b7a5c', margin: 0 }}>
          © 2026 AgroYield Network · Nigeria ·{' '}
          <a href="/terms" style={{ color: '#4b7a5c', textDecoration: 'underline' }}>Terms of Service</a>
        </p>
      </footer>
    </main>
  )
}
