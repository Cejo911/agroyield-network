import Link from 'next/link'

// Single source of truth for the public-site footer.
// Used on /, /about, /contact, /privacy, /terms, /businesses (signed-out view).
// Links here should stay in sync with the marketing nav.
const LINKS = [
  { label: 'Home',    href: '/',        external: false },
  { label: 'About',   href: '/about',   external: false },
  { label: 'Contact', href: '/contact', external: false },
  { label: 'Privacy', href: '/privacy', external: false },
  { label: 'Terms',   href: '/terms',   external: false },
  { label: 'X / Twitter', href: 'https://x.com/agroyield90351',                    external: true },
  { label: 'LinkedIn',    href: 'https://www.linkedin.com/company/agroyield-network', external: true },
] as const

export default function PublicFooter() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-transparent">
      <div className="max-w-6xl mx-auto px-5 sm:px-10 py-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          <p className="leading-relaxed">© 2026 AgroYield Network. All rights reserved.</p>
          <p className="text-[10px] mt-1 opacity-60">An Agcoms International Project</p>
        </div>
        <nav
          aria-label="Footer"
          className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm"
        >
          {LINKS.map(link =>
            link.external ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.label}
                href={link.href}
                className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                {link.label}
              </Link>
            )
          )}
        </nav>
      </div>
    </footer>
  )
}
