'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const CATEGORIES = [
  'Input Costs',
  'Transport & Logistics',
  'Labour & Wages',
  'Market Fees & Commissions',
  'Equipment & Maintenance',
  'Rent & Storage',
  'Utilities',
  'Marketing & Advertising',
  'Professional Services',
  'Other',
]

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'POS', 'Mobile Money', 'Cheque']

interface Expense {
  id: string
  date: string
  category: string
  description: string
  amount: number
  payment_method: string
  notes?: string
}

interface Business { id: string }

const SPREAD_PRESETS = [
  { label: 'No spread', months: 0 },
  { label: '3 months (quarterly)', months: 3 },
  { label: '6 months (half-year)', months: 6 },
  { label: '12 months (annual)', months: 12 },
  { label: 'Custom', months: -1 },
]

const empty = { date: new Date().toISOString().split('T')[0], category: CATEGORIES[0], description: '', amount: '', payment_method: 'Cash', notes: '', spreadMonths: 0, customMonths: '' }

export default function ExpensesPage() {
  const supabase = createClient()
  const [expenses,  setExpenses]  = useState<Expense[]>([])
  const [business,  setBusiness]  = useState<Business | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form,      setForm]      = useState<typeof empty>(empty)
  const [saving,    setSaving]    = useState(false)
  const [filterCat, setFilterCat] = useState('All')
  const [deleting,  setDeleting]  = useState<string | null>(null)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: biz } = await supabase.from('businesses').select('id').eq('user_id', user.id).single()
    if (!biz) return
    setBusiness(biz)
    const { data } = await supabase
      .from('business_expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
    setExpenses(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!business) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const totalAmount = parseFloat(form.amount as string)
    const months = form.spreadMonths === -1 ? (parseInt(form.customMonths) || 0) : form.spreadMonths

    if (months > 1) {
      // Spread: create one entry per month with split amount
      const monthlyAmount = Math.round((totalAmount / months) * 100) / 100
      // Handle rounding — put any remainder on the first entry
      const remainder = Math.round((totalAmount - monthlyAmount * months) * 100) / 100
      const startDate = new Date(form.date)
      const entries = []

      for (let i = 0; i < months; i++) {
        const entryDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, Math.min(startDate.getDate(), 28))
        const amount = i === 0 ? monthlyAmount + remainder : monthlyAmount
        entries.push({
          user_id:        user!.id,
          business_id:    business.id,
          date:           entryDate.toISOString().split('T')[0],
          category:       form.category,
          description:    form.description,
          amount,
          payment_method: form.payment_method,
          notes:          `${i + 1}/${months} — Spread over ${months} months (total: ₦${totalAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })})${form.notes ? ' · ' + form.notes : ''}`,
        })
      }
      await supabase.from('business_expenses').insert(entries)
    } else {
      // Single expense — normal insert
      await supabase.from('business_expenses').insert({
        user_id:        user!.id,
        business_id:    business.id,
        date:           form.date,
        category:       form.category,
        description:    form.description,
        amount:         totalAmount,
        payment_method: form.payment_method,
        notes:          form.notes || null,
      })
    }

    setSaving(false)
    setShowModal(false)
    setForm(empty)
    load()
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    await supabase.from('business_expenses').delete().eq('id', id)
    setDeleting(null)
    load()
  }

  const filtered = filterCat === 'All' ? expenses : expenses.filter(e => e.category === filterCat)

  const totalAll   = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const thisMonth  = new Date().toISOString().slice(0, 7)
  const totalMonth = expenses.filter(e => e.date.slice(0, 7) === thisMonth).reduce((s, e) => s + Number(e.amount), 0)

  const byCategory = CATEGORIES.map(cat => ({
    cat,
    total: expenses.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount), 0),
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total)

  function fmt(n: number) {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 }).format(n).replace('NGN', '₦')
  }

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  if (loading) return <div className="text-gray-400 text-sm p-8">Loading expenses…</div>

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expenses</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track what you spend to know what you earn</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          + Add Expense
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">This Month</p>
          <p className="text-2xl font-bold text-red-600">{fmt(totalMonth)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">All Time</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{fmt(totalAll)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Total Entries</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{expenses.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expenses list */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            {/* Filter bar */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex gap-1.5 overflow-x-auto pb-3 sm:pb-3 sm:flex-wrap">
              {['All', ...CATEGORIES].map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCat(cat)}
                  className={`text-xs font-medium px-3 py-1 rounded-full transition-colors ${
                    filterCat === cat
                      ? 'bg-green-700 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                No expenses yet. Click <strong>+ Add Expense</strong> to record one.
              </div>
            ) : (
              <>
              {/* Desktop Table */}
              <table className="w-full hidden md:table">
                <thead>
                  <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100 dark:border-gray-800">
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-left px-4 py-3">Description</th>
                    <th className="text-left px-4 py-3">Category</th>
                    <th className="text-right px-4 py-3">Amount</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((exp, idx) => (
                    <tr key={exp.id} className={`border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/40 dark:bg-gray-800/20'}`}>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{fmtDate(exp.date)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{exp.description}</span>
                          {exp.notes?.includes('Spread over') && (
                            <span className="text-[10px] font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                              {exp.notes.split('—')[0]?.trim()}
                            </span>
                          )}
                        </div>
                        {exp.notes && <div className="text-xs text-gray-400 mt-0.5">{exp.notes}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
                          {exp.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-red-600">{fmt(Number(exp.amount))}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleDelete(exp.id)} disabled={deleting === exp.id}
                          className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none">×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map(exp => (
                  <div key={exp.id} className="p-4 flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{exp.description}</p>
                        {exp.notes?.includes('Spread over') && (
                          <span className="text-[10px] font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0">
                            {exp.notes.split('—')[0]?.trim()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                        <span>{fmtDate(exp.date)}</span>
                        <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded-full font-medium">
                          {exp.category}
                        </span>
                      </div>
                      {exp.notes && <p className="text-xs text-gray-400 mt-0.5">{exp.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <span className="text-sm font-bold text-red-600">{fmt(Number(exp.amount))}</span>
                      <button onClick={() => handleDelete(exp.id)} disabled={deleting === exp.id}
                        className="text-gray-300 hover:text-red-500 text-lg leading-none">×</button>
                    </div>
                  </div>
                ))}
              </div>
              </>
            )}
          </div>
        </div>

        {/* Category breakdown */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wide">By Category</h3>
            {byCategory.length === 0 ? (
              <p className="text-xs text-gray-400">No data yet.</p>
            ) : (
              <div className="space-y-3">
                {byCategory.map(({ cat, total }) => (
                  <div key={cat}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600 dark:text-gray-400 font-medium">{cat}</span>
                      <span className="text-gray-800 dark:text-gray-200 font-semibold">{fmt(total)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-400 rounded-full"
                        style={{ width: `${Math.min(100, (total / totalAll) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Add Expense</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
          <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Date</label>
                  <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Amount (₦)</label>
                  <input type="number" min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <input type="text" placeholder="What was this expense for?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Payment Method</label>
                  <select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500">
                    {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="text" placeholder="Any additional details" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>

              {/* Spread over months */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Spread over multiple months?</label>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">e.g. annual rent</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {SPREAD_PRESETS.map(p => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setForm({ ...form, spreadMonths: p.months, customMonths: '' })}
                      className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                        form.spreadMonths === p.months
                          ? 'bg-green-700 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                {form.spreadMonths === -1 && (
                  <input
                    type="number"
                    min="2"
                    max="60"
                    placeholder="Number of months"
                    value={form.customMonths}
                    onChange={e => setForm({ ...form, customMonths: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                )}
                {(() => {
                  const months = form.spreadMonths === -1 ? (parseInt(form.customMonths) || 0) : form.spreadMonths
                  const amount = parseFloat(form.amount as string) || 0
                  if (months > 1 && amount > 0) {
                    const monthly = Math.round((amount / months) * 100) / 100
                    return (
                      <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                        → {fmt(monthly)}/month × {months} months = {fmt(amount)}
                      </p>
                    )
                  }
                  return null
                })()}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold py-2 rounded-lg disabled:opacity-50 transition-colors">
                  {saving ? 'Saving…' : 'Save Expense'}
                </button>
              </div>
            </form>  
          </div>
        </div>
      )}
    </div>
  )
}
