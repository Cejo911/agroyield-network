import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import MobileNav from './MobileNav'
import SidebarThemeToggle from './SidebarThemeToggle'
import BusinessSwitcher from './BusinessSwitcher'

export default async function BusinessLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 py-6 pb-24 lg:pb-6">
        <div className="flex gap-6">
          {/* Desktop Sidebar — hidden on mobile */}
          <aside className="w-48 shrink-0 hidden lg:block">
            <nav className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-3 space-y-1 sticky top-6">
              {/* Logo */}
              <div className="px-3 py-2 mb-1">
                <Image
                  src="/logo-horizontal-colored.png"
                  alt="AgroYield Network"
                  width={170}
                  height={50}
                />
              </div>
              <div className="border-t border-gray-100 dark:border-gray-800 my-1" />

              {/* Business switcher — shows dropdown when user has multiple businesses */}
              <BusinessSwitcher />

              <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
              {/* Back to main dashboard */}
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
              >
                ← All Modules
              </Link>

              <div className="border-t border-gray-100 dark:border-gray-800 my-1" />

              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 pb-1 pt-1">Business</p>
              <Link href="/business" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-700 transition-colors">🏠 Dashboard</Link>
              <Link href="/business/setup" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-700 transition-colors">⚙️ Setup</Link>
              <Link href="/business/products" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-700 transition-colors">📦 Products</Link>
              <Link href="/business/customers" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-700 transition-colors">👥 Customers</Link>
              <Link href="/business/invoices" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-700 transition-colors">🧾 Invoices</Link>
              <Link href="/business/expenses" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-700 transition-colors">💸 Expenses</Link>
              <Link href="/business/assets" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-700 transition-colors">🏗️ Assets</Link>
              <Link href="/business/reports" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-700 transition-colors">📊 Reports</Link>
              <Link href="/business/team" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-700 transition-colors">👥 Team</Link>

              <SidebarThemeToggle />
            </nav>
          </aside>
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>

      {/* Mobile Bottom Navigation — visible only on mobile */}
      <MobileNav />
    </div>
  )
}
