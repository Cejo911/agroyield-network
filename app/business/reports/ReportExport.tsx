'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getBusinessAccess } from '@/lib/business-access'
import { getActiveBusinessId } from '@/lib/business-cookie'

export default function ReportExport({ period }: { period: string }) {
  const [loading, setLoading] = useState<'excel' | null>(null)
  const supabase = createClient()

    async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const access = await getBusinessAccess(supabase, user.id, getActiveBusinessId())
    if (!access) return null

    const [invoicesRes, expensesRes, customersRes, businessRes] = await Promise.all([
      supabase.from('invoices').select('*').eq('business_id', access.businessId).order('issue_date', { ascending: false }),
      supabase.from('business_expenses').select('*').eq('business_id', access.businessId).order('date', { ascending: false }),
      supabase.from('customers').select('id, name').eq('business_id', access.businessId),
      supabase.from('businesses').select('*').eq('id', access.businessId).single(),
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

    const ExcelJS = (await import('exceljs')).default
    const { invoices, expenses, customers, business } = data
    const customerMap = Object.fromEntries(customers.map((c: any) => [c.id, c.name]))
    const wb = new ExcelJS.Workbook()

    // ── Sheet 1: P&L Summary ──────────────────────────────────
    const paidInvoices  = invoices.filter((i: any) => i.status === 'paid')
    const totalRevenue  = paidInvoices.reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0)
    const totalExpenses = expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0)
    const netProfit     = totalRevenue - totalExpenses
    const margin        = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0'

    const s1 = wb.addWorksheet('P&L Summary')
    s1.columns = [{ width: 36 }, { width: 22 }]
    s1.addRow([`${business?.name || 'AgroYield'} — Business Report`])
    s1.addRow(['Generated:', new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })])
    s1.addRow([])
    s1.addRow(['PROFIT & LOSS SUMMARY', ''])
    s1.addRow(['Total Revenue (Paid Invoices)', totalRevenue])
    s1.addRow(['Total Expenses',                totalExpenses])
    s1.addRow(['Net Profit',                    netProfit])
    s1.addRow(['Profit Margin',                 `${margin}%`])
    s1.addRow([])
    s1.addRow(['INVOICE STATUS', ''])
    s1.addRow(['Draft',   invoices.filter((i: any) => i.status === 'draft').length])
    s1.addRow(['Sent',    invoices.filter((i: any) => i.status === 'sent').length])
    s1.addRow(['Paid',    invoices.filter((i: any) => i.status === 'paid').length])
    s1.addRow(['Overdue', invoices.filter((i: any) => i.status === 'overdue').length])
    s1.addRow(['Total',   invoices.length])

    // ── Sheet 2: All Invoices ─────────────────────────────────
    const s2 = wb.addWorksheet('Invoices')
    s2.columns = [{ width: 14 }, { width: 14 }, { width: 26 }, { width: 12 }, { width: 18 }]
    s2.addRow(['Invoice #', 'Issue Date', 'Customer', 'Status', 'Amount (₦)'])
    invoices.forEach((inv: any) => {
      s2.addRow([
        inv.invoice_number,
        inv.issue_date,
        customerMap[inv.customer_id] || 'Unknown',
        inv.status?.toUpperCase(),
        Number(inv.total_amount || 0),
      ])
    })
    s2.addRow([])
    s2.addRow(['', '', '', 'TOTAL PAID', totalRevenue])

    // ── Sheet 3: All Expenses ─────────────────────────────────
    const s3 = wb.addWorksheet('Expenses')
    s3.columns = [{ width: 14 }, { width: 32 }, { width: 26 }, { width: 18 }, { width: 15 }]
    s3.addRow(['Date', 'Description', 'Category', 'Payment Method', 'Amount (₦)'])
    expenses.forEach((exp: any) => {
      s3.addRow([
        exp.date,
        exp.description,
        exp.category,
        exp.payment_method,
        Number(exp.amount || 0),
      ])
    })
    s3.addRow([])
    s3.addRow(['', '', '', 'TOTAL', totalExpenses])

    // ── Sheet 4: Monthly P&L (last 12 months) ────────────────
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date()
      d.setMonth(d.getMonth() - (11 - i))
      return d.toISOString().slice(0, 7)
    })
    const s4 = wb.addWorksheet('Monthly P&L')
    s4.columns = [{ width: 12 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 12 }]
    s4.addRow(['Month', 'Revenue (₦)', 'Expenses (₦)', 'Net Profit (₦)', 'Margin %'])
    months.forEach(m => {
      const rev  = paidInvoices.filter((i: any) => i.issue_date?.slice(0, 7) === m).reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0)
      const exp  = expenses.filter((e: any) => e.date?.slice(0, 7) === m).reduce((s: number, e: any) => s + Number(e.amount || 0), 0)
      const prof = rev - exp
      s4.addRow([m, rev, exp, prof, rev > 0 ? `${((prof / rev) * 100).toFixed(1)}%` : '0.0%'])
    })

    // ── Download ──────────────────────────────────────────────
    const filename = `${(business?.name || 'AgroYield').replace(/\s+/g, '_')}_Report_${new Date().toISOString().slice(0, 10)}.xlsx`
    const buffer = await wb.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
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
