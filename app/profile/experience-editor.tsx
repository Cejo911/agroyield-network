'use client'

import { useState } from 'react'
import type { ExperienceRow } from '@/lib/profile-experience'
import { formatRange } from '@/lib/profile-experience'

// Owner-facing experience editor.
//
// Mounts on /profile only. CRUD hits /api/profile/experience which enforces
// ownership via RLS (plus a defensive .eq('profile_id', user.id) on writes).
//
// Interaction model:
//   - "+ Add experience" opens an inline add form.
//   - Clicking "Edit" on a row swaps that row for an inline edit form.
//   - "Delete" uses a native confirm() — destructive, but reversible by
//     re-adding (experience rows aren't audit-logged like transactions).
//
// Form state is lifted to this component. Each form action calls the API,
// then on success refreshes local `rows` from the response — no router
// refetch needed.

type FormState = {
  role:         string
  organisation: string
  start_date:   string
  end_date:     string
  is_current:   boolean
  description:  string
}

const EMPTY_FORM: FormState = {
  role:         '',
  organisation: '',
  start_date:   '',
  end_date:     '',
  is_current:   false,
  description:  '',
}

function toFormState(row: ExperienceRow): FormState {
  return {
    role:         row.role,
    organisation: row.organisation,
    start_date:   row.start_date,
    end_date:     row.end_date ?? '',
    is_current:   row.is_current,
    description:  row.description ?? '',
  }
}

export default function ExperienceEditor({ initialRows }: { initialRows: ExperienceRow[] }) {
  const [rows, setRows] = useState<ExperienceRow[]>(initialRows)
  const [adding, setAdding]   = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm]       = useState<FormState>(EMPTY_FORM)
  const [error, setError]     = useState<string | null>(null)
  const [busy, setBusy]       = useState(false)

  // Server returns rows in the same order the read helper does. Rather than
  // duplicate that sort on the client, we re-sort defensively after mutations
  // so the UI always matches /directory and /u regardless of which surface
  // the user navigates to next.
  const sort = (list: ExperienceRow[]): ExperienceRow[] =>
    [...list].sort((a, b) => {
      if (a.is_current !== b.is_current) return a.is_current ? -1 : 1
      return b.start_date.localeCompare(a.start_date)
    })

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setAdding(false)
    setEditingId(null)
    setError(null)
  }

  const startAdd = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setAdding(true)
    setError(null)
  }

  const startEdit = (row: ExperienceRow) => {
    setAdding(false)
    setEditingId(row.id)
    setForm(toFormState(row))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const payload = {
        role:         form.role.trim(),
        organisation: form.organisation.trim(),
        start_date:   form.start_date,
        end_date:     form.is_current ? null : (form.end_date || null),
        is_current:   form.is_current,
        description:  form.description.trim() || null,
      }

      let res: Response
      if (editingId) {
        res = await fetch('/api/profile/experience', {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ id: editingId, ...payload }),
        })
      } else {
        res = await fetch('/api/profile/experience', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        })
      }

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        return
      }

      const returnedRow = data.row as ExperienceRow
      setRows(prev => {
        const without = prev.filter(r => r.id !== returnedRow.id)
        return sort([...without, returnedRow])
      })
      resetForm()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this experience row? This cannot be undone.')) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/profile/experience?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => ({} as Record<string, unknown>))
      if (!res.ok) {
        setError((data as { error?: string }).error || 'Failed to delete')
        return
      }
      setRows(prev => prev.filter(r => r.id !== id))
      if (editingId === id) resetForm()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <span>💼</span> Experience
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Add roles, study programmes, and farm operations to help others understand your background.
          </p>
        </div>
        {!adding && !editingId && (
          <button
            type="button"
            onClick={startAdd}
            className="text-sm font-semibold text-green-700 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 border border-green-200 dark:border-green-800 px-3 py-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
          >
            + Add experience
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {adding && (
        <ExperienceForm
          form={form}
          setForm={setForm}
          busy={busy}
          onSubmit={handleSubmit}
          onCancel={resetForm}
          submitLabel="Save experience"
        />
      )}

      {rows.length === 0 && !adding ? (
        <p className="text-sm text-gray-500 dark:text-gray-500 text-center py-6">
          No experience yet. Add your first role above.
        </p>
      ) : (
        <ol className="space-y-4 mt-2">
          {rows.map(row => (
            <li key={row.id}>
              {editingId === row.id ? (
                <ExperienceForm
                  form={form}
                  setForm={setForm}
                  busy={busy}
                  onSubmit={handleSubmit}
                  onCancel={resetForm}
                  submitLabel="Save changes"
                  onDelete={() => handleDelete(row.id)}
                />
              ) : (
                <div className="flex gap-3">
                  <span
                    aria-hidden
                    className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                      row.is_current
                        ? 'bg-green-500 ring-2 ring-green-200 dark:ring-green-900/40'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{row.role}</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{row.organisation}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatRange(row)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => startEdit(row)}
                        disabled={busy}
                        className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-green-700 dark:hover:text-green-400 border border-gray-200 dark:border-gray-700 px-2.5 py-1 rounded-md hover:border-green-300 dark:hover:border-green-700 transition-colors shrink-0 disabled:opacity-50"
                      >
                        Edit
                      </button>
                    </div>
                    {row.description && (
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
                        {row.description}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function ExperienceForm({
  form,
  setForm,
  busy,
  onSubmit,
  onCancel,
  submitLabel,
  onDelete,
}: {
  form:        FormState
  setForm:     (updater: (prev: FormState) => FormState) => void
  busy:        boolean
  onSubmit:    (e: React.FormEvent) => void
  onCancel:    () => void
  submitLabel: string
  onDelete?:   () => void
}) {
  return (
    <form onSubmit={onSubmit} className="bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Role *</label>
          <input
            type="text"
            value={form.role}
            onChange={e => setForm(prev => ({ ...prev, role: e.target.value }))}
            required
            maxLength={150}
            placeholder="e.g. Smallholder Farmer"
            className="w-full text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Organisation *</label>
          <input
            type="text"
            value={form.organisation}
            onChange={e => setForm(prev => ({ ...prev, organisation: e.target.value }))}
            required
            maxLength={150}
            placeholder="e.g. Green Acres Co-op"
            className="w-full text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Start date *</label>
          <input
            type="date"
            value={form.start_date}
            onChange={e => setForm(prev => ({ ...prev, start_date: e.target.value }))}
            required
            className="w-full text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">End date</label>
          <input
            type="date"
            value={form.end_date}
            onChange={e => setForm(prev => ({ ...prev, end_date: e.target.value }))}
            disabled={form.is_current}
            min={form.start_date || undefined}
            className="w-full text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        <input
          type="checkbox"
          checked={form.is_current}
          onChange={e => setForm(prev => ({
            ...prev,
            is_current: e.target.checked,
            end_date:   e.target.checked ? '' : prev.end_date,
          }))}
          className="rounded border-gray-300 dark:border-gray-600 text-green-600 focus:ring-green-500"
        />
        I currently work here
      </label>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          Description <span className="text-gray-500 dark:text-gray-500">(optional)</span>
        </label>
        <textarea
          value={form.description}
          onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
          rows={3}
          maxLength={2000}
          placeholder="What you did, what you grew, what you built…"
          className="w-full text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
        <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-1 text-right">
          {form.description.length} / 2000
        </p>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="mr-auto text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
          >
            Delete
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-lg disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="text-sm font-semibold bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
