'use client'
import { useState } from 'react'
import Link from 'next/link'
import RecordPaymentButton from './RecordPaymentButton'

const STATUS_COLORS: Record<string, string> = {
  draft:   'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  sent:    'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  paid:    'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  overdue: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
}

const DOC_LABELS: Record<string, string> = {
  invoice:       'Invoice',
  proforma:      'Proforma',
  receipt:       'Receipt',
  delivery_note: 'Delivery Note',
}

const STATUS_OPTIONS = ['All', 'draft', 'sent', 'paid', 'overdue']

function fmt(n: number) {
  return `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
}

export default function InvoicesTable({ invoices }: { invoices: any[] }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  const filtered = invoices.filter(inv => {
    const matchesSearch =
      inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      (inv.customers as any)?.name?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'All' || inv.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-4">
      {/* Search + Filter bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <input
          type="text"
          placeholder="Search invoice or customer…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 w-full sm:w-72"
        />
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors capitalize whitespace-nowrap ${
                statusFilter === s
                  ? 'bg-green-700 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table / Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-10 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">No invoices match your search.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          {/* Desktop Table */}
          <table className="w-full text-sm hidden md:table">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Number</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Date</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Total</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {filtered.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3">
                    <Link href={`/business/invoices/${inv.id}`} className="font-medium text-green-700 dark:text-green-400 hover:underline">
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {DOC_LABELS[inv.document_type] ?? inv.document_type}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {(inv.customers as any)?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{inv.issue_date}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800 dark:text-white">
                    {fmt(inv.total ?? 0)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[inv.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <RecordPaymentButton invoice={inv} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.map(inv => (
              <Link key={inv.id} href={`/business/invoices/${inv.id}`}
                className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-green-700 dark:text-green-400 text-sm">{inv.invoice_number}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      {(inv.customers as any)?.name ?? '—'}
                    </p>
                  </div>
                  <div className="text-right ml-3">
                    <p className="font-bold text-sm text-gray-800 dark:text-white">{fmt(inv.total ?? 0)}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${STATUS_COLORS[inv.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {inv.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  <span>{DOC_LABELS[inv.document_type] ?? inv.document_type}</span>
                  <span>·</span>
                  <span>{inv.issue_date}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
