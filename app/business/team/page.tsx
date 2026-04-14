'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getBusinessAccess, canManageTeam } from '@/lib/business-access'
import { getActiveBusinessId } from '@/lib/business-cookie'

interface TeamMember {
  id: string
  email: string
  role: 'owner' | 'accountant' | 'staff'
  status: 'pending' | 'accepted' | 'revoked'
  user_id: string | null
  invited_at: string
  accepted_at: string | null
}

const ROLE_LABELS: Record<string, { label: string; desc: string; color: string }> = {
  owner:      { label: 'Owner',      desc: 'Full access to everything',                     color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400' },
  accountant: { label: 'Accountant', desc: 'View all, manage invoices, expenses & reports', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
  staff:      { label: 'Staff',      desc: 'View-only with limited create access',          color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' },
}

const STATUS_STYLES: Record<string, string> = {
  pending:  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  accepted: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  revoked:  'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
}

export default function TeamPage() {
  const supabase = createClient()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // Invite form
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'accountant' | 'staff'>('staff')
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  // Edit role
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState<'accountant' | 'staff'>('staff')

  useEffect(() => {
    loadTeam()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadTeam() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const access = await getBusinessAccess(supabase, user.id, getActiveBusinessId())
    if (!access) { setLoading(false); return }
    setBusinessId(access.businessId)

    const { data } = await supabase
      .from('business_team')
      .select('*')
      .eq('business_id', access.businessId)
      .order('invited_at', { ascending: false })

    setMembers(data || [])
    setLoading(false)
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!businessId || !inviteEmail.trim()) return

    setSending(true)
    setFeedback(null)

    try {
      const res = await fetch('/api/business/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: businessId,
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setFeedback({ type: 'error', msg: data.error || 'Failed to send invitation' })
      } else {
        setFeedback({ type: 'success', msg: `Invitation sent to ${inviteEmail}` })
        setInviteEmail('')
        setShowInvite(false)
        loadTeam()
      }
    } catch {
      setFeedback({ type: 'error', msg: 'Network error — please try again' })
    }

    setSending(false)
  }

  async function handleRevoke(id: string) {
    if (!confirm('Revoke this team member\'s access?')) return

    const { error } = await supabase
      .from('business_team')
      .update({ status: 'revoked' })
      .eq('id', id)

    if (!error) loadTeam()
  }

  async function handleResend(member: TeamMember) {
    setSending(true)
    setFeedback(null)

    try {
      const res = await fetch('/api/business/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: businessId,
          email: member.email,
          role: member.role,
          resend: true,
        }),
      })

      if (res.ok) {
        setFeedback({ type: 'success', msg: `Invitation re-sent to ${member.email}` })
      } else {
        setFeedback({ type: 'error', msg: 'Failed to re-send invitation' })
      }
    } catch {
      setFeedback({ type: 'error', msg: 'Network error' })
    }

    setSending(false)
  }

  async function handleRoleChange(id: string) {
    const { error } = await supabase
      .from('business_team')
      .update({ role: editRole })
      .eq('id', id)

    if (!error) {
      setEditingId(null)
      loadTeam()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Permanently remove this team member? This cannot be undone.')) return

    const { error } = await supabase
      .from('business_team')
      .delete()
      .eq('id', id)

    if (!error) loadTeam()
  }

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    )
  }

  const activeMembers = members.filter(m => m.status === 'accepted')
  const pendingMembers = members.filter(m => m.status === 'pending')
  const revokedMembers = members.filter(m => m.status === 'revoked')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Invite your accountant or staff to collaborate on your business
          </p>
        </div>
        <button
          onClick={() => { setShowInvite(!showInvite); setFeedback(null) }}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium self-start sm:self-auto"
        >
          + Invite Member
        </button>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div className={`p-3 rounded-lg text-sm ${
          feedback.type === 'success'
            ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
            : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
        }`}>
          {feedback.msg}
        </div>
      )}

      {/* Invite Form */}
      {showInvite && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Send Invitation</h2>
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email address</label>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="accountant@example.com"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Role</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(['accountant', 'staff'] as const).map(role => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setInviteRole(role)}
                    className={`text-left p-3 rounded-lg border-2 transition-colors ${
                      inviteRole === role
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{ROLE_LABELS[role].label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{ROLE_LABELS[role].desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={sending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {sending ? 'Sending…' : 'Send Invitation'}
              </button>
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Role legend */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Role Permissions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Object.entries(ROLE_LABELS).map(([key, val]) => (
            <div key={key} className="flex items-start gap-2">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${val.color}`}>{val.label}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{val.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Active Members */}
      {activeMembers.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Active Members ({activeMembers.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {activeMembers.map(m => (
              <div key={m.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{m.email}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Joined {fmtDate(m.accepted_at || m.invited_at)}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {editingId === m.id ? (
                    <>
                      <select
                        value={editRole}
                        onChange={e => setEditRole(e.target.value as 'accountant' | 'staff')}
                        className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value="accountant">Accountant</option>
                        <option value="staff">Staff</option>
                      </select>
                      <button onClick={() => handleRoleChange(m.id)} className="text-xs text-green-600 font-medium">Save</button>
                      <button onClick={() => setEditingId(null)} className="text-xs text-gray-500">Cancel</button>
                    </>
                  ) : (
                    <>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${ROLE_LABELS[m.role]?.color || ''}`}>
                        {ROLE_LABELS[m.role]?.label || m.role}
                      </span>
                      <button
                        onClick={() => { setEditingId(m.id); setEditRole(m.role as 'accountant' | 'staff') }}
                        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        title="Change role"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleRevoke(m.id)}
                        className="text-xs text-red-500 hover:text-red-700"
                        title="Revoke access"
                      >
                        Revoke
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Invitations */}
      {pendingMembers.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Pending Invitations ({pendingMembers.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {pendingMembers.map(m => (
              <div key={m.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{m.email}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Invited {fmtDate(m.invited_at)}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${ROLE_LABELS[m.role]?.color || ''}`}>
                    {ROLE_LABELS[m.role]?.label || m.role}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES.pending}`}>Pending</span>
                  <button
                    onClick={() => handleResend(m)}
                    disabled={sending}
                    className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 font-medium disabled:opacity-50"
                  >
                    Resend
                  </button>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revoked */}
      {revokedMembers.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Revoked ({revokedMembers.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {revokedMembers.map(m => (
              <div key={m.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{m.email}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Revoked</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES.revoked}`}>Revoked</span>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {members.length === 0 && !showInvite && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center">
          <p className="text-4xl mb-3">👥</p>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No team members yet</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Invite your accountant or staff to help manage your business
          </p>
          <button
            onClick={() => setShowInvite(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            + Send First Invitation
          </button>
        </div>
      )}
    </div>
  )
}
