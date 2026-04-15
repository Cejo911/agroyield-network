/**
 * FAQ data for all AgroYield modules.
 *
 * Single source of truth — used by the central /faq page and
 * inline FAQ sections on each module page.
 *
 * To add a question: find the module's array below, append a new { q, a } object.
 * To add a module: add a new key to MODULE_FAQS and a matching entry in MODULE_META.
 */

export type FAQItem = { q: string; a: string }

export type ModuleKey =
  | 'dashboard'
  | 'community'
  | 'opportunities'
  | 'grants'
  | 'marketplace'
  | 'prices'
  | 'directory'
  | 'research'
  | 'mentorship'
  | 'business'
  | 'account'

/** Display metadata for each module (used on /faq tabs) */
export const MODULE_META: Record<ModuleKey, { label: string; icon: string; description: string }> = {
  dashboard:     { label: 'Dashboard',       icon: '📊', description: 'Your personalised hub for activity, metrics, and quick actions' },
  community:     { label: 'Community',       icon: '💬', description: 'Discussions, polls, and networking with fellow agripreneurs' },
  opportunities: { label: 'Opportunities',   icon: '📢', description: 'Jobs, internships, and collaboration opportunities' },
  grants:        { label: 'Grants',          icon: '🏦', description: 'Track and apply for agricultural grants and funding' },
  marketplace:   { label: 'Marketplace',     icon: '🛒', description: 'Buy, sell, and advertise agricultural products and services' },
  prices:        { label: 'Price Tracker',   icon: '📈', description: 'Real-time commodity prices across Nigerian states' },
  directory:     { label: 'Directory',       icon: '👥', description: 'Find and connect with agricultural professionals' },
  research:      { label: 'Research Hub',    icon: '🔬', description: 'Access and share agricultural research papers' },
  mentorship:    { label: 'Mentorship',      icon: '🎓', description: 'Find mentors, become a mentor, book sessions' },
  business:      { label: 'Business Suite',  icon: '💼', description: 'Invoicing, expenses, inventory, and financial reports' },
  account:       { label: 'Account & Billing', icon: '⚙️', description: 'Subscription plans, profile settings, and account management' },
}

/** FAQ content per module */
export const MODULE_FAQS: Record<ModuleKey, FAQItem[]> = {
  dashboard: [
    {
      q: 'What does the dashboard show me?',
      a: 'Your dashboard is a personalised overview of everything happening on AgroYield — recent community posts, your business metrics, upcoming mentorship sessions, grant deadlines, and quick actions to navigate the platform.',
    },
    {
      q: 'Can I customise which modules appear on my dashboard?',
      a: 'The dashboard automatically adapts based on the modules you use most. Modules you haven\'t activated (like Business Suite) will show up as quick-start prompts instead of active widgets.',
    },
    {
      q: 'Why do some cards show a lock icon?',
      a: 'Locked features are available to Pro or Growth subscribers. Visit the Pricing page to see what each plan includes and upgrade if you\'re interested.',
    },
  ],

  community: [
    {
      q: 'How do I create a post?',
      a: 'From the Community page, use the text box at the top to write your post. You can add images and tag a category. Posts are visible to all members.',
    },
    {
      q: 'Can I create polls?',
      a: 'Yes. When creating a post, switch to the Poll tab to add poll options. You can set a closing date after which votes are locked and results become final.',
    },
    {
      q: 'How do I report inappropriate content?',
      a: 'Click the three-dot menu on any post or comment and select "Report." The admin team reviews all reports and takes action within 24 hours.',
    },
    {
      q: 'What are the community guidelines?',
      a: 'Keep discussions professional and agriculture-related. No spam, no hate speech, no misleading claims. Repeated violations may lead to account suspension.',
    },
  ],

  opportunities: [
    {
      q: 'Who can post opportunities?',
      a: 'Any verified member can post jobs, internships, or collaboration requests. Admins review posts to ensure quality and relevance.',
    },
    {
      q: 'How do I apply for an opportunity?',
      a: 'Click on any opportunity listing to view details. Use the provided contact method or application link to apply directly to the poster.',
    },
    {
      q: 'Are opportunities only in Nigeria?',
      a: 'Most opportunities are Nigeria-based, but international positions and remote roles are welcome. Check the location tag on each listing.',
    },
  ],

  grants: [
    {
      q: 'How are grants listed on AgroYield?',
      a: 'Our team curates grants from trusted sources — government agencies, NGOs, foundations, and international bodies. Each listing includes eligibility criteria, deadlines, and application links.',
    },
    {
      q: 'Can I save grants to apply later?',
      a: 'Yes. Click the bookmark icon on any grant to save it to your list. You\'ll receive a reminder as the deadline approaches.',
    },
    {
      q: 'Does AgroYield help with grant applications?',
      a: 'Currently, we link you to the official application process. We\'re planning to add application tracking and templates in a future update.',
    },
    {
      q: 'How often are new grants added?',
      a: 'We update the grants database weekly. Enable notifications in your profile settings to get alerts when new grants matching your interests are published.',
    },
  ],

  marketplace: [
    {
      q: 'How do I list a product for sale?',
      a: 'Go to Marketplace and click "Post Listing." Add a title, description, price, images, and your state. Listings are visible to all members immediately.',
    },
    {
      q: 'Does AgroYield handle payments?',
      a: 'Marketplace transactions happen directly between buyer and seller. We recommend using Paystack payment links for secure payments. AgroYield does not take a commission on marketplace sales.',
    },
    {
      q: 'Can I advertise services, not just products?',
      a: 'Absolutely. You can list consulting services, equipment rental, transport, processing, and any agriculture-related service.',
    },
    {
      q: 'How do I contact a seller?',
      a: 'Each listing shows the seller\'s profile. Use the built-in messaging system to contact them directly, or use the phone/WhatsApp links on their profile if available.',
    },
  ],

  prices: [
    {
      q: 'Where does the price data come from?',
      a: 'Price data is sourced from markets across Nigerian states and updated regularly. The data covers major commodities like rice, maize, cassava, tomatoes, poultry, and more.',
    },
    {
      q: 'How often are prices updated?',
      a: 'Prices are updated daily for major commodities in high-volume markets, and weekly for smaller markets and less-traded commodities.',
    },
    {
      q: 'Can I compare prices across states?',
      a: 'Yes. Use the state filter and commodity selector to compare prices across different markets. This helps identify the best locations to buy or sell.',
    },
    {
      q: 'Can I submit price data from my local market?',
      a: 'Community-sourced pricing is on our roadmap. For now, if you notice significantly outdated prices, contact us at hello@agroyield.africa.',
    },
  ],

  directory: [
    {
      q: 'How do I appear in the directory?',
      a: 'Every AgroYield member with a completed profile appears in the directory automatically. Make sure your bio, location, and interests are filled in for better visibility.',
    },
    {
      q: 'What do the badges mean?',
      a: 'A green checkmark (✓) indicates a Pro subscriber. An amber star (⭐) indicates a Growth subscriber. These badges signal active, invested members of the community.',
    },
    {
      q: 'Can I search for specific expertise?',
      a: 'Yes. Use the search bar and filters to find members by name, state, interests, or role (farmer, researcher, student, agripreneur, institution).',
    },
    {
      q: 'How do I connect with someone?',
      a: 'Visit their profile and click "Message" to start a private conversation, or click "Follow" to see their community posts in your feed.',
    },
  ],

  research: [
    {
      q: 'What kind of research is available?',
      a: 'The Research Hub hosts agricultural research papers, case studies, and technical reports relevant to Nigerian and African agriculture — from crop science to agribusiness economics.',
    },
    {
      q: 'Can I upload my own research?',
      a: 'Yes. Researchers and students can submit papers for publication. Uploaded research goes through a brief review before appearing in the hub.',
    },
    {
      q: 'Is the research free to access?',
      a: 'All research on AgroYield is free to read for all members. We believe open access to agricultural knowledge drives innovation.',
    },
  ],

  mentorship: [
    {
      q: 'Who can access mentorship features?',
      a: 'Mentorship is available to Pro and Growth subscribers. Free-tier members can view mentor profiles but need to upgrade to book sessions or apply as mentors.',
    },
    {
      q: 'How do I become a mentor?',
      a: 'Go to Mentorship → "Become a Mentor." Fill in your expertise areas, bio, and availability. Your mentor profile will be listed once approved.',
    },
    {
      q: 'How do mentorship sessions work?',
      a: 'Browse available mentors, view their expertise and ratings, and send a session request. Once the mentor accepts, you\'ll both receive details to schedule your meeting.',
    },
    {
      q: 'Is mentorship free?',
      a: 'Mentorship sessions are currently free for all subscribers. In the future, mentors may be able to set hourly rates for paid sessions.',
    },
  ],

  business: [
    {
      q: 'What can I do with the Business Suite?',
      a: 'Manage your agribusiness with invoicing (create and send professional invoices), expense tracking, inventory management, team collaboration, and financial reporting — all in one place.',
    },
    {
      q: 'How many businesses can I manage?',
      a: 'Free and Pro plans support 1 business. Growth plan supports unlimited businesses — ideal if you run multiple agricultural ventures.',
    },
    {
      q: 'Are there limits on invoices?',
      a: 'Free plan: 15 invoices per month. Pro and Growth plans: unlimited invoices. If you\'re approaching your limit, you\'ll see a prompt to upgrade.',
    },
    {
      q: 'Can I invite team members?',
      a: 'Yes. Free plan supports up to 3 team members. Pro and Growth plans have no team size limit. Invite members from your business settings page.',
    },
    {
      q: 'Can I export my financial data?',
      a: 'Pro and Growth subscribers can export invoices, expenses, and reports as CSV or PDF files. This is useful for tax filing and bookkeeping.',
    },
  ],

  account: [
    {
      q: 'What subscription plans are available?',
      a: 'AgroYield offers three tiers: Free (core access with limits), Pro (₦2,000/month — unlimited invoices, verified badge, full reports), and Growth (₦5,000/month — multi-business, all Pro features, priority placement).',
    },
    {
      q: 'How do I upgrade my plan?',
      a: 'Visit the Pricing page from your dashboard or navigation menu. Select your preferred plan and billing cycle (monthly or annual), then complete payment via Paystack.',
    },
    {
      q: 'What happens when my subscription expires?',
      a: 'You\'ll receive an email reminder 3 days before expiry. If you don\'t renew, your account reverts to the Free tier — your data is preserved, but premium features become locked.',
    },
    {
      q: 'Can I get a refund?',
      a: 'Subscriptions are non-refundable once activated. If you experience issues, contact hello@agroyield.africa and we\'ll work with you to resolve them.',
    },
    {
      q: 'How do I update my profile?',
      a: 'Go to your Profile page (click your avatar → Profile). You can edit your bio, location, interests, avatar, social links, and contact details at any time.',
    },
    {
      q: 'Is my data safe?',
      a: 'Yes. AgroYield uses Supabase with row-level security and encrypted connections. We never share your personal data with third parties without consent.',
    },
  ],
}

/** Get FAQs for a specific module */
export function getModuleFAQs(module: ModuleKey): FAQItem[] {
  return MODULE_FAQS[module] ?? []
}

/** Get all modules that have FAQs */
export function getAllModuleKeys(): ModuleKey[] {
  return Object.keys(MODULE_FAQS) as ModuleKey[]
}
