'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import BookmarkButton from '@/app/components/design/BookmarkButton'
import { useToast } from '@/app/components/Toast'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

// Row aliases derived from the auto-generated Database type.
type Grant = Database['public']['Tables']['grants']['Row']
type GrantApplication = Database['public']['Tables']['grant_applications']['Row']
type GrantApplicationUpdate = Database['public']['Tables']['grant_applications']['Update']
type ProfileSummary = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'first_name' | 'last_name' | 'role' | 'institution' | 'location' | 'bio' | 'linkedin' | 'email'
>

type DocItem = { name: string; completed: boolean }

const DEFAULT_DOCS: DocItem[] = [
  { name: 'CV / Resume', completed: false },
  { name: 'Cover Letter / Statement of Purpose', completed: false },
  { name: 'Project Proposal', completed: false },
  { name: 'Budget Plan', completed: false },
  { name: 'Reference Letters', completed: false },
  { name: 'ID / Passport Copy', completed: false },
]

const STATUS_PIPELINE = ['draft', 'submitted', 'shortlisted', 'rejected', 'awarded'] as const

const statusMeta: Record<string, { label: string; color: string; bg: string }> = {
  draft:       { label: 'Draft',       color: 'text-gray-600 dark:text-gray-400',   bg: 'bg-gray-200 dark:bg-gray-700' },
  submitted:   { label: 'Submitted',   color: 'text-blue-700 dark:text-blue-400',   bg: 'bg-blue-500' },
  shortlisted: { label: 'Shortlisted', color: 'text-yellow-700 dark:text-yellow-400', bg: 'bg-yellow-500' },
  rejected:    { label: 'Rejected',    color: 'text-red-700 dark:text-red-400',     bg: 'bg-red-500' },
  awarded:     { label: 'Awarded',     color: 'text-green-700 dark:text-green-400', bg: 'bg-green-500' },
}

interface Props {
  grant: Grant
  application: GrantApplication | null
  userProfile: ProfileSummary | null
  userId: string
  initiallySaved?: boolean
}

export default function GrantDetail({ grant, application, userProfile, userId, initiallySaved = false }: Props) {
  const supabase = createClient() as SupabaseClient<Database>
  const { showError } = useToast()
  const [app, setApp] = useState<GrantApplication | null>(application)
  const [newDocName, setNewDocName] = useState('')
  const [showDocInput, setShowDocInput] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState(app?.notes || '')
  // documents is stored as Json in the DB; narrow to DocItem[] at the boundary.
  const initialDocs = Array.isArray(app?.documents) ? (app?.documents as unknown as DocItem[]) : null
  const [documents, setDocuments] = useState<DocItem[]>(
    initialDocs && initialDocs.length > 0 ? initialDocs : DEFAULT_DOCS
  )
  const [status, setStatus] = useState<GrantApplication['status']>(app?.status || 'draft')

  const isExpired = grant.deadline && new Date(grant.deadline) < new Date()
  const canApply = grant.status === 'open' && !isExpired

  // Start tracking this grant
  async function startApplication() {
    setSaving(true)
    const { data, error } = await supabase
      .from('grant_applications')
      .insert({
        user_id: userId,
        grant_id: grant.id,
        status: 'draft',
        documents: DEFAULT_DOCS,
        notes: '',
      })
      .select()
      .single()

    if (!error && data) {
      setApp(data)
      setStatus('draft')
      setDocuments(DEFAULT_DOCS)
    } else if (error) {
      showError(error.message || 'Could not save. Please try again.')
    }
    setSaving(false)
  }

  // Update application
  async function saveApplication() {
    if (!app) return
    setSaving(true)
    const updates: GrantApplicationUpdate = {
      notes,
      documents,
      status,
      updated_at: new Date().toISOString(),
    }
    if (status === 'submitted' && !app.submitted_at) {
      updates.submitted_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('grant_applications')
      .update(updates)
      .eq('id', app.id)

    if (error) {
      showError(error.message || 'Could not save. Please try again.')
    } else {
      setApp({ ...app, ...updates })
    }
    setSaving(false)
  }

  // Delete application
  async function deleteApplication() {
    if (!app || !confirm('Remove this application from your tracker?')) return
    await supabase.from('grant_applications').delete().eq('id', app.id)
    setApp(null)
    setStatus('draft')
    setNotes('')
    setDocuments(DEFAULT_DOCS)
  }

  function toggleDoc(index: number) {
    setDocuments(prev => prev.map((d, i) => i === index ? { ...d, completed: !d.completed } : d))
  }

  // Add-document UX: inline input row instead of native prompt() — see
  // ux-ui-audit-26apr.md Theme 1. The input is shown on click of "Add
  // document"; pressing Enter or "Add" appends the doc and clears the
  // input; Escape or "Cancel" hides it. State (showDocInput, newDocName)
  // lives at the component level alongside other form state.
  function commitNewDoc() {
    const name = newDocName.trim()
    if (!name) {
      setShowDocInput(false)
      return
    }
    setDocuments(prev => [...prev, { name, completed: false }])
    setNewDocName('')
    setShowDocInput(false)
  }

  function removeDoc(index: number) {
    setDocuments(prev => prev.filter((_, i) => i !== index))
  }

  // Format amount
  const formatAmt = (n: number | null) => {
    if (!n) return null
    return grant.currency === 'NGN' ? `₦${n.toLocaleString()}` : grant.currency === 'USD' ? `$${n.toLocaleString()}` : `${grant.currency} ${n.toLocaleString()}`
  }
  const amountMin = formatAmt(grant.amount_min)
  const amountMax = formatAmt(grant.amount_max)
  const amountStr = amountMin && amountMax && amountMin !== amountMax
    ? `${amountMin} – ${amountMax}`
    : amountMax ? `Up to ${amountMax}` : amountMin ? `From ${amountMin}` : null

  const deadlineStr = grant.deadline
    ? new Date(grant.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    : null

  return (
    <div>
      {/* Grant info card */}
      <div className="relative bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-6">
        <div className="absolute top-4 right-4 z-10">
          <BookmarkButton
            contentType="grant"
            contentId={grant.id}
            initiallySaved={initiallySaved}
            size="md"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap mb-3 pr-12">
          {grant.featured && (
            <span className="text-xs font-bold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded-full">⭐ Featured</span>
          )}
          {grant.verified && (
            <span className="text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">✓ Verified</span>
          )}
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            grant.status === 'open' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
            grant.status === 'upcoming' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
            'bg-gray-100 dark:bg-gray-800 text-gray-500'
          }`}>
            {grant.status.charAt(0).toUpperCase() + grant.status.slice(1)}
          </span>
          <span className="text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
            {grant.category}
          </span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{grant.title}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">{grant.funder}</p>

        {/* Key details */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
          {amountStr && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold">Funding</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">{amountStr}</p>
            </div>
          )}
          {deadlineStr && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold">Deadline</p>
              <p className={`text-sm font-bold mt-0.5 ${isExpired ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                {deadlineStr} {isExpired && '(Expired)'}
              </p>
            </div>
          )}
          {grant.region && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold">Region</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">{grant.region}</p>
            </div>
          )}
          {grant.stage && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold">Stage</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">{grant.stage}</p>
            </div>
          )}
        </div>

        {/* Description */}
        {grant.description && (
          <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Description</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">{grant.description}</p>
          </div>
        )}

        {/* Eligibility */}
        {grant.eligibility && (
          <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Eligibility</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">{grant.eligibility}</p>
          </div>
        )}

        {/* External apply link */}
        {grant.apply_link && (
          <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
            <a
              href={grant.apply_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
            >
              Apply on External Site →
            </a>
          </div>
        )}
      </div>

      {/* Application tracker */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Application Tracker</h2>

        {/* How to use guide */}
        <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/50 rounded-lg p-4 mb-5 text-sm text-green-800 dark:text-green-300">
          <p className="font-semibold mb-2">How to use this tracker:</p>
          <p className="leading-relaxed text-green-700 dark:text-green-400">
            1. Click <strong>Start Tracking</strong> to begin monitoring this grant.
            2. Use the <strong>Status</strong> pills to update your progress — start at Draft while preparing, move to Submitted once you apply, then update as you hear back.
            3. Tick off items in the <strong>Document Checklist</strong> as you prepare them. Add custom items with &quot;+ Add item&quot;.
            4. Use <strong>Notes</strong> for contact details, reference numbers, or reminders.
            5. Click <strong>Save Progress</strong> to save all changes. View all your tracked grants from <strong>My Applications</strong>.
          </p>
        </div>

        {!app ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
              {canApply
                ? 'Track your application progress for this grant.'
                : 'This grant is currently not accepting applications.'}
            </p>
            {canApply && (
              <button
                onClick={startApplication}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-6 py-2.5 rounded-lg disabled:opacity-50 transition-colors"
              >
                {saving ? 'Starting...' : 'Start Tracking'}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status pipeline */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Status</p>
              <div className="flex items-center gap-1 flex-wrap">
                {STATUS_PIPELINE.map((s, i) => {
                  const meta = statusMeta[s]
                  const isActive = status === s
                  const isPast = STATUS_PIPELINE.indexOf(status as typeof STATUS_PIPELINE[number]) > i
                  return (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                        isActive
                          ? `${meta.bg} text-white border-transparent`
                          : isPast
                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                            : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-500 border-gray-200 dark:border-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {meta.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Auto-populated profile info */}
            {userProfile && (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Your Profile (auto-populated)</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Name: </span>
                    <span className="text-gray-900 dark:text-white font-medium">{userProfile.first_name} {userProfile.last_name}</span>
                  </div>
                  {userProfile.role && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Role: </span>
                      <span className="text-gray-900 dark:text-white font-medium capitalize">{userProfile.role}</span>
                    </div>
                  )}
                  {userProfile.institution && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Institution: </span>
                      <span className="text-gray-900 dark:text-white font-medium">{userProfile.institution}</span>
                    </div>
                  )}
                  {userProfile.location && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Location: </span>
                      <span className="text-gray-900 dark:text-white font-medium">{userProfile.location}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">This info is pulled from your profile. <Link href="/profile" className="text-green-600 hover:underline">Edit profile →</Link></p>
              </div>
            )}

            {/* Document checklist */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Document Checklist ({documents.filter(d => d.completed).length}/{documents.length})
                </p>
                {!showDocInput && (
                  <button onClick={() => setShowDocInput(true)} className="text-xs text-green-600 hover:underline font-medium">+ Add item</button>
                )}
              </div>
              {/* Inline doc-add input (replaces native prompt()). Enter
                  commits, Escape cancels. Auto-focuses when shown. */}
              {showDocInput && (
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="text"
                    autoFocus
                    value={newDocName}
                    onChange={e => setNewDocName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); commitNewDoc() }
                      else if (e.key === 'Escape') { setShowDocInput(false); setNewDocName('') }
                    }}
                    placeholder="Document name…"
                    className="flex-1 text-sm px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    type="button"
                    onClick={commitNewDoc}
                    className="text-xs text-white bg-green-600 hover:bg-green-700 font-medium px-3 py-1.5 rounded-md"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowDocInput(false); setNewDocName('') }}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:underline px-2"
                  >
                    Cancel
                  </button>
                </div>
              )}
              <div className="space-y-2">
                {documents.map((doc, i) => (
                  <div key={i} className="flex items-center gap-3 group">
                    <button
                      onClick={() => toggleDoc(i)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
                        doc.completed
                          ? 'bg-green-600 border-green-600 text-white'
                          : 'border-gray-300 dark:border-gray-600 hover:border-green-500'
                      }`}
                    >
                      {doc.completed && <span className="text-xs">✓</span>}
                    </button>
                    <span className={`text-sm flex-1 ${doc.completed ? 'line-through text-gray-500 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>
                      {doc.name}
                    </span>
                    <button
                      onClick={() => removeDoc(i)}
                      className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Notes</p>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={4}
                placeholder="Add your notes, reminders, contact details..."
                className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={saveApplication}
                disabled={saving}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2.5 rounded-lg disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save Progress'}
              </button>
              <button
                onClick={deleteApplication}
                className="border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
