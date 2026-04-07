export default function TermsOfService() {
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
        <h1 style={{ fontSize: 36, fontWeight: 900, color: '#f0fdf4', letterSpacing: -1, marginBottom: 8 }}>Terms of Service</h1>
        <p style={{ fontSize: 14, color: '#4b7a5c', marginBottom: 48 }}>Last updated: April 7, 2026</p>

        {[
          {
            title: '1. Acceptance of Terms',
            body: `By accessing or using AgroYield Network at agroyield.africa, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the platform.`,
          },
          {
            title: '2. Description of Service',
            body: `AgroYield Network is a professional networking platform for Nigeria's agricultural sector, connecting students, researchers, farmers, and agripreneurs. The platform provides features including a member directory, opportunities board, agricultural marketplace, research board, and commodity price tracking.`,
          },
          {
            title: '3. User Accounts',
            body: `You must create an account to access most features of AgroYield Network. You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. You agree to provide accurate and complete information when creating your profile and to keep it up to date.`,
          },
          {
            title: '4. Acceptable Use',
            body: `You agree to use AgroYield Network only for lawful purposes and in ways that do not infringe the rights of others. You must not post false, misleading, or fraudulent content, harass or harm other members, use the platform to send unsolicited messages or spam, attempt to gain unauthorised access to any part of the platform, or use automated tools to scrape or extract data from the platform.`,
          },
          {
            title: '5. User Content',
            body: `You retain ownership of content you post on AgroYield Network, including your profile information, marketplace listings, and research posts. By posting content, you grant AgroYield Network a non-exclusive licence to display and distribute that content within the platform. You are solely responsible for the accuracy and legality of content you post.`,
          },
          {
            title: '6. Opportunities and Marketplace',
            body: `AgroYield Network provides a platform for listing opportunities and agricultural products but does not itself offer, guarantee, or endorse any specific opportunity, product, or service listed by members. Users engage with listings at their own discretion and risk. We encourage due diligence before entering into any agreement or transaction with another member.`,
          },
          {
            title: '7. Intellectual Property',
            body: `The AgroYield Network name, logo, and platform design are the property of AgroYield Network. You may not reproduce, distribute, or create derivative works from our intellectual property without explicit written permission.`,
          },
          {
            title: '8. Termination',
            body: `We reserve the right to suspend or terminate your account at our discretion if you violate these Terms of Service or engage in conduct that is harmful to other members or the platform. You may also delete your account at any time by contacting hello@agroyield.africa.`,
          },
          {
            title: '9. Disclaimers',
            body: `AgroYield Network is provided "as is" without warranties of any kind. We do not guarantee the accuracy of member profiles, listings, or commodity price data. We are not liable for any loss or damage arising from your use of the platform or reliance on content posted by other members.`,
          },
          {
            title: '10. Governing Law',
            body: `These Terms of Service are governed by the laws of the Federal Republic of Nigeria. Any disputes arising from these terms or your use of the platform shall be subject to the jurisdiction of Nigerian courts.`,
          },
          {
            title: '11. Changes to Terms',
            body: `We may update these Terms of Service from time to time. We will notify registered members of significant changes by email. Continued use of the platform after changes constitutes acceptance of the updated terms.`,
          },
          {
            title: '12. Contact Us',
            body: `If you have any questions about these Terms of Service, please contact us at hello@agroyield.africa or write to AgroYield Network, Nigeria.`,
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
          <a href="/privacy" style={{ color: '#4b7a5c', textDecoration: 'underline' }}>Privacy Policy</a>
        </p>
      </footer>
    </main>
  )
}
