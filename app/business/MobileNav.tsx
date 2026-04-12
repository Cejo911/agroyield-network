'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ThemeToggle from '@/app/components/ThemeToggle'

const NAV_ITEMS = [
  { href: '/business', label: 'Home', icon: '🏠' },
  { href: '/business/products', label: 'Products', icon: '📦' },
  { href: '/business/invoices', label: 'Invoices', icon: '🧾' },
  { href: '/business/expenses', label: 'Expenses', icon: '💸' },
  { href: '/business/assets', label: 'Assets', icon: '🏗️' },
]

export default function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 lg:hidden z-50">
      <div className="flex items-center justify-around px-2 py-1.5 max-w-lg mx-auto">
        {NAV_ITEMS.map(item => {
          const isActive = item.href === '/business'
            ? pathname === '/business'
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[11px] min-w-[56px] transition-colors ${
                isActive
                  ? 'text-green-700 dark:text-green-400 font-semibold'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
        <div className="flex flex-col items-center gap-0.5 px-1 py-1">
          <ThemeToggle />
        </div>
      </div>
    </nav>
  )
}
