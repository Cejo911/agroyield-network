'use client'

import { useState, useEffect, useRef } from 'react'

/**
 * "Scan Receipt" button for the Expenses page. Wraps the full OCR flow:
 *
 *   [Open modal] → pick or snap image → POST /api/expense-ocr → preview
 *   extracted fields in an editable form → PATCH /api/expense-ocr/[id]
 *   to commit, or close/discard.
 *
 * Hard-learned UX rules (see scratchpad #49):
 *   - Every server error surfaces in the modal. No silent fire-and-forget.
 *   - Quota exhaustion shows the current used/limit + an upgrade hint.
 *   - Mobile gets `capture="environment"` so the rear camera opens
 *     directly from the file picker on Android/iOS.
 *   - Confidence score is shown when low (<0.75) as a "double-check the
 *     fields" prompt — we don't want users blindly committing bad OCR.
 */

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

interface UsageInfo {
  used: number
  limit: number | null
  remaining: number | null
}

interface ExtractedReceipt {
  id: string
  receipt_url: string
  vendor: string | null
  amount: number | null
  receipt_date: string | null
  vat_amount: number | null
  suggested_category: string | null
  confidence_score: number | null
  status: string
}

interface Props {
  businessId: string
  onSaved?: () => void
}

export default function ReceiptScanButton({ businessId, onSaved }: Props) {
  const [open, setOpen] = useState(false)
  const [stage, setStage] = useState<'upload' | 'extracting' | 'review' | 'saving'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<ExtractedReceipt | null>(null)
  const [usage, setUsage] = useState<UsageInfo | null>(null)
  const [tier, setTier] = useState<string | null>(null)

  // Review-form state — prefilled from extraction, editable.
  const [vendor, setVendor] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [description, setDescription] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [notes, setNotes] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch current usage whenever the modal opens so we can show the counter
  // before the user commits to uploading anything.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    fetch(`/api/expense-ocr?businessId=${encodeURIComponent(businessId)}`)
      .then(async (r) => {
        const body = await r.json().catch(() => ({}))
        if (cancelled) return
        if (!r.ok) {
          setError(body?.error ?? `Could not load usage (${r.status})`)
          return
        }
        setUsage(body.usage ?? null)
        setTier(body.tier ?? null)
      })
      .catch((e) => {
        if (!cancelled) setError(e.message ?? 'Could not load usage')
      })
    return () => { cancelled = true }
  }, [open, businessId])

  function reset() {
    setStage('upload')
    setFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setError(null)
    setReceipt(null)
    setVendor('')
    setAmount('')
    setDate('')
    setCategory(CATEGORIES[0])
    setDescription('')
    setPaymentMethod('Cash')
    setNotes('')
  }

  function closeModal() {
    setOpen(false)
    // Small delay so the closing animation doesn't flash empty state.
    setTimeout(reset, 200)
  }

  function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setError(null)
    setFile(f)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(f))
  }

  async function handleExtract() {
    if (!file) return
    setError(null)
    setStage('extracting')
    try {
      const fd = new FormData()
      fd.append('receipt', file)
      fd.append('businessId', businessId)

      const res = await fetch('/api/expense-ocr', { method: 'POST', body: fd })
      const body = await res.json().catch(() => ({}))

      if (!res.ok) {
        // Quota exhausted (402) surfaces the upgrade hint. Flag off (403)
        // and file errors (400) surface the server's message as-is.
        const msg =
          body?.error ??
          `Could not extract receipt (${res.status}). Please try again.`
        setError(msg)
        setStage('upload')
        return
      }

      const r = body.receipt as ExtractedReceipt
      setReceipt(r)
      setUsage(body.usage ?? null)
      setVendor(r.vendor ?? '')
      setAmount(r.amount != null ? String(r.amount) : '')
      setDate(r.receipt_date ?? new Date().toISOString().slice(0, 10))
      setCategory(r.suggested_category ?? 'Other')
      setDescription(r.vendor ?? 'Receipt')
      setStage('review')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
      setStage('upload')
    }
  }

  async function handleCommit(e: React.FormEvent) {
    e.preventDefault()
    if (!receipt) return
    setError(null)
    setStage('saving')
    try {
      const res = await fetch(`/api/expense-ocr/${receipt.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor,
          amount: parseFloat(amount),
          date,
          category,
          description,
          paymentMethod,
          notes: notes || null,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body?.error ?? `Could not save (${res.status})`)
        setStage('review')
        return
      }
      if (body.warning) {
        // Non-fatal: expense saved but audit link failed. Log + move on.
        console.warn('[receipt-scan] commit warning:', body.warning)
      }
      closeModal()
      onSaved?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
      setStage('review')
    }
  }

  async function handleDiscard() {
    if (!receipt) {
      closeModal()
      return
    }
    try {
      await fetch(`/api/expense-ocr/${receipt.id}`, { method: 'DELETE' })
    } catch (e) {
      console.warn('[receipt-scan] discard failed:', e)
    }
    closeModal()
  }

  // ----- Render -----

  const usageLabel = usage
    ? usage.limit === null
      ? `${usage.used} this month (unlimited)`
      : `${usage.used}/${usage.limit} this month`
    : null

  const nearLimit = usage && usage.limit !== null && usage.used >= Math.floor(usage.limit * 0.75)
  const lowConfidence = receipt?.confidence_score !== null && receipt?.confidence_score !== undefined && receipt.confidence_score < 0.75

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-green-700 dark:border-green-600 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
      >
        <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Scan Receipt
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">Scan Receipt</h2>
                {usageLabel && (
                  <p className={`text-xs mt-0.5 ${nearLimit ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    {usageLabel}
                    {nearLimit && usage?.limit !== null && tier === 'free' && (
                      <> · <a href="/pricing" className="underline font-semibold">Upgrade to Pro for 100/mo</a></>
                    )}
                  </p>
                )}
              </div>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-600 text-xl leading-none" aria-label="Close">×</button>
            </div>

            {error && (
              <div className="mx-5 mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            {/* STAGE: upload */}
            {stage === 'upload' && (
              <div className="p-5 space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Take a photo or pick a receipt image. We&apos;ll extract the vendor, amount, date, and suggest a category — you can edit anything before saving.
                </p>

                <label className="block">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="environment"
                    onChange={onFileChosen}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-green-600 dark:hover:border-green-500 rounded-xl p-8 flex flex-col items-center justify-center gap-2 transition-colors"
                  >
                    {previewUrl ? (
                      // previewUrl is a blob: URL from URL.createObjectURL —
                      // Next/Image's loader can't fetch blob: schemes, so the
                      // native element is required here.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previewUrl} alt="Receipt preview" className="max-h-48 rounded-lg shadow-sm" />
                    ) : (
                      <>
                        <svg aria-hidden="true" className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tap to choose or take a photo</span>
                        <span className="text-xs text-gray-500">JPEG, PNG, or WebP · max 5 MB</span>
                      </>
                    )}
                  </button>
                  {file && previewUrl && (
                    <p className="text-xs text-gray-500 mt-2 truncate">
                      <span className="font-medium">{file.name}</span> · {(file.size / 1024).toFixed(0)} KB
                    </p>
                  )}
                </label>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExtract}
                    disabled={!file}
                    className="flex-1 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Extract receipt
                  </button>
                </div>
              </div>
            )}

            {/* STAGE: extracting (loading) */}
            {stage === 'extracting' && (
              <div className="p-10 flex flex-col items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-green-700 border-t-transparent"></div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Reading your receipt…</p>
                <p className="text-xs text-gray-500">This usually takes 3–5 seconds.</p>
              </div>
            )}

            {/* STAGE: review */}
            {(stage === 'review' || stage === 'saving') && receipt && (
              <form onSubmit={handleCommit} className="p-5 space-y-4">
                {previewUrl && (
                  <div className="flex justify-center">
                    {/* blob: URL from URL.createObjectURL — Next/Image not supported. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt="Receipt" className="max-h-32 rounded-lg shadow-sm" />
                  </div>
                )}

                {lowConfidence && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                    Low confidence ({((receipt.confidence_score ?? 0) * 100).toFixed(0)}%). Please double-check the fields below before saving.
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Vendor</label>
                    <input type="text" value={vendor} onChange={(e) => setVendor(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Amount (₦) *</label>
                    <input type="number" min="0" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Description *</label>
                  <input type="text" required value={description} onChange={(e) => setDescription(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Date *</label>
                    <input type="date" required value={date} onChange={(e) => setDate(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Category</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500">
                      {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Payment Method</label>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500">
                    {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Notes <span className="text-gray-500 font-normal">(optional)</span>
                  </label>
                  <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any additional details"
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={handleDiscard}
                    className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                    Discard
                  </button>
                  <button type="submit" disabled={stage === 'saving'}
                    className="flex-1 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold py-2 rounded-lg disabled:opacity-50 transition-colors">
                    {stage === 'saving' ? 'Saving…' : 'Save Expense'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
