import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'

export default async function BusinessLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          <aside className="w-48 shrink-0">
            <nav className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 space-y-1 sticky top-6">
          {/* Logo */}
<div className="px-3 py-2 mb-1">
  <Image
    src="/logo-horizontal-colored.png"
    alt="AgroYield Network"
    width={140}
    height={35}
  />
</div>
<div className="border-t border-gray-100 my-1" />
              {/* Back to main dashboard */}
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-green-700 hover:bg-green-50 transition-colors"
              >
                ← All Modules
              </Link>

              <div className="border-t border-gray-100 my-1" />

              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 pb-1 pt-1">Business</p>
              <Link href="/business" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors">🏠 Dashboard</Link>
              <Link href="/business/setup" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors">⚙️ Setup</Link>
              <Link href="/business/products" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors">📦 Products</Link>
              <Link href="/business/customers" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors">👥 Customers</Link>
              <Link href="/business/invoices" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors">🧾 Invoices</Link>
              <Link href="/business/expenses" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors">💸 Expenses</Link>
              <Link href="/business/reports" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors">📊 Reports</Link>
            </nav>
          </aside>
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  )
}
