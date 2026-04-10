'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import * as XLSX from 'xlsx'

export default function ReportExport({ period }: { period: string }) {
  const [loading, setLoading] = useState<'excel' | null>(null)
  const supabase = createClient()

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const [invoicesRes, expensesRes, customersRes, businessRes] = await Promise.all([
      supabase.from('invoices').select('*').eq('user_id', user.id).order('issue_date', { ascending: false }),
      supabase.from('business_expenses').select('*').eq('user_id', user.id).order('date', { ascending: false }),
      supabase.from('customers').select('id, name').eq('user_id', user.id),
      supabase.from('businesses').select('*').eq('user_id', user.id).single(),
    ])

    return {
      invoices:  invoicesRes.data  || [],
      expenses:  expensesRes.data  || [],
      customers: customersRes.data || [],
      business:  businessRes.data,
    }
  }

  async function exportExcel() {
    setLoading('excel')
    const data = await fetchData()
    if (!data) { setLoading(null); return }

    const { invoices, expenses, customers, business } = data
    const customerMap = Object.fromEntries(customers.map((c: any) => [c.id, c.name]))
    const wb = XLSX.utils.book_new()

    // ── Sheet 1: P&L Summary ──────────────────────────────────
    const paidInvoices  = invoices.filter((i: any) => i.status === 'paid')
    const totalRevenue  = paidInvoices.reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0)
    const totalExpenses = expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0)
    const netProfit     = totalRevenue - totalExpenses
    const margin        = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0'

    const summaryRows = [
      [`${business?.name || 'AgroYield'} — Business Report`],
      ['Generated:', new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })],
      [],
      ['PROFIT & LOSS SUMMARY', ''],
      ['Total Revenue (Paid Invoices)', totalRevenue],
      ['Total Expenses',                totalExpenses],
      ['Net Profit',                    netProfit],
      ['Profit Margin',                 `${margin}%`],
      [],
      ['INVOICE STATUS', ''],
      ['Draft',   invoices.filter((i: any) => i.status === 'draft').length],
      ['Sent',    invoices.filter((i: any) => i.status === 'sent').length],
      ['Paid',    invoices.filter((i: any) => i.status === 'paid').length],
      ['Overdue', invoices.filter((i: any) => i.status === 'overdue').length],
      ['Total',   invoices.length],
    ]
    const s1 = XLSX.utils.aoa_to_sheet(summaryRows)
    s1['!cols'] = [{ wch: 36 }, { wch: 22 }]
    XLSX.utils.book_append_sheet(wb, s1, 'P&L Summary')

    // ── Sheet 2: All Invoices ─────────────────────────────────
    const invoiceRows = [
      ['Invoice #', 'Issue Date', 'Customer', 'Status', 'Amount (₦)'],
      ...invoices.map((inv: any) => [
        inv.invoice_number,
        inv.issue_date,
        customerMap[inv.customer_id] || 'Unknown',
        inv.status?.toUpperCase(),
        Number(inv.total_amount || 0),
      ]),
      [],
      ['', '', '', 'TOTAL PAID', totalRevenue],
    ]
    const s2 = XLSX.utils.aoa_to_sheet(invoiceRows)
    s2['!cols'] = [{ wch: 14 }, { wch: 14 }, { wch: 26 }, { wch: 12 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, s2, 'Invoices')

    // ── Sheet 3: All Expenses ─────────────────────────────────
    const expenseRows = [
      ['Date', 'Description', 'Category', 'Payment Method', 'Amount (₦)'],
      ...expenses.map((exp: any) => [
        exp.date,
        exp.description,
        exp.category,
        exp.payment_method,
        Number(exp.amount || 0),
      ]),
      [],
      ['', '', '', 'TOTAL', totalExpenses],
    ]
    const s3 = XLSX.utils.aoa_to_sheet(expenseRows)
    s3['!cols'] = [{ wch: 14 }, { wch: 32 }, { wch: 26 }, { wch: 18 }, { wch: 15 }]
    XLSX.utils.book_append_sheet(wb, s3, 'Expenses')

    // ── Sheet 4: Monthly P&L (last 12 months) ────────────────
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date()
      d.setMonth(d.getMonth() - (11 - i))
      return d.toISOString().slice(0, 7)
    })
    const monthlyRows = [
      ['Month', 'Revenue (₦)', 'Expenses (₦)', 'Net Profit (₦)', 'Margin %'],
      ...months.map(m => {
        const rev  = paidInvoices.filter((i: any) => i.issue_date?.slice(0, 7) === m).reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0)
        const exp  = expenses.filter((e: any) => e.date?.slice(0, 7) === m).reduce((s: number, e: any) => s + Number(e.amount || 0), 0)
        const prof = rev - exp
        return [m, rev, exp, prof, rev > 0 ? `${((prof / rev) * 100).toFixed(1)}%` : '0.0%']
      }),
    ]
    const s4 = XLSX.utils.aoa_to_sheet(monthlyRows)
    s4['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(wb, s4, 'Monthly P&L')

    // ── Download ──────────────────────────────────────────────
    const filename = `${(business?.name || 'AgroYield').replace(/\s+/g, '_')}_Report_${new Date().toISOString().slice(0, 10)}.xlsx`
    XLSX.writeFile(wb, filename)
    setLoading(null)
  }

  function exportPDF() {
    window.open(`/business/reports/print?period=${period}`, '_blank')
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={exportExcel}
        disabled={loading === 'excel'}
        className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-green-400 hover:text-green-700 dark:hover:text-green-400 transition-all disabled:opacity-50"
      >
        {loading === 'excel' ? '⏳ Exporting…' : '📊 Excel'}
      </button>
      <button
        onClick={exportPDF}
        className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-green-400 hover:text-green-700 dark:hover:text-green-400 transition-all"
      >
        📄 PDF
      </button>
    </div>
  )
}
