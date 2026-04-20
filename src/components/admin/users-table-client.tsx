'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ChevronUp, ChevronDown, ChevronsUpDown, Plus, X, Crown, User, Mail, Clock } from 'lucide-react'
import { toast } from 'sonner'

const PAGE_SIZE = 20

type SortKey = 'name' | 'role' | 'connectorCount' | 'createdAt'
type SortDir = 'asc' | 'desc'

interface UserRow {
  id:             string
  email:          string
  name:           string
  avatarUrl:      string | null
  role:           string
  createdAt:      string | Date
  connectorCount: number
}

interface PendingInvite {
  id:        string
  email:     string
  role:      string
  expiresAt: string
  createdAt: string
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown size={11} className="text-[#C4B8B0]" />
  return sortDir === 'asc'
    ? <ChevronUp size={11} className="text-[#C4853A]" />
    : <ChevronDown size={11} className="text-[#C4853A]" />
}

function SortTh({ label, col, sortKey, sortDir, onSort }: {
  label: string; col: SortKey; sortKey: SortKey; sortDir: SortDir; onSort: (c: SortKey) => void
}) {
  return (
    <th className="text-left px-5 py-3 text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em]">
      <button onClick={() => onSort(col)} className="inline-flex items-center gap-1 hover:text-[#1A1917] transition-colors">
        {label}
        <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
      </button>
    </th>
  )
}

function InviteModal({ onClose, onInvited }: { onClose: () => void; onInvited: (inv: PendingInvite) => void }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'member' | 'admin'>('member')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ acceptUrl: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const submit = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      })
      const data = await res.json() as { ok?: boolean; id?: string; acceptUrl?: string; error?: { message?: string } }
      if (!res.ok || !data.ok) {
        toast.error(data.error?.message ?? 'Failed to create invitation')
        return
      }
      setResult({ acceptUrl: data.acceptUrl! })
      onInvited({
        id: data.id!,
        email,
        role,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      })
    } finally {
      setLoading(false)
    }
  }

  const copyLink = async () => {
    if (!result?.acceptUrl) return
    await navigator.clipboard.writeText(result.acceptUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-[12px] border border-[#E3E1DC] shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E3E1DC]">
          <h2 className="text-[#1A1917] text-base font-medium">Invite member</h2>
          <button onClick={onClose} className="text-[#9C9890] hover:text-[#1A1917] transition-colors">
            <X size={16} />
          </button>
        </div>

        {result ? (
          <div className="px-6 py-5 flex flex-col gap-4">
            <p className="text-[#6B6966] text-sm">
              Invitation created. Share this link with <strong className="text-[#1A1917]">{email}</strong> — it expires in 7 days.
            </p>
            <div className="flex items-center gap-2 bg-[#1A1917] rounded-[6px] px-3 py-2.5">
              <code className="text-[#C4853A] font-mono text-xs flex-1 break-all">{result.acceptUrl}</code>
              <button
                onClick={() => void copyLink()}
                className="text-[#9C9890] hover:text-[#C4853A] transition-colors flex-none text-xs font-medium"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-[#9C9890] text-xs">
              After clicking the link, the user signs in with Google as normal. No email is sent automatically — you need to share this link.
            </p>
            <button
              onClick={onClose}
              className="self-end text-sm font-medium text-[#1A1917] bg-[#C4853A] hover:bg-[#E8A855] px-4 py-2 rounded-[8px] transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="px-6 py-5 flex flex-col gap-4">
            <div>
              <label className="text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em] mb-1.5 block">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && email) void submit() }}
                placeholder="colleague@company.com"
                autoFocus
                className="w-full h-9 px-3 text-sm text-[#1A1917] bg-white border border-[#E3E1DC] rounded-[8px] focus:outline-none focus:border-[#C4853A] transition-colors placeholder:text-[#9C9890]"
              />
            </div>
            <div>
              <label className="text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em] mb-1.5 block">Role</label>
              <div className="flex gap-2">
                {(['member', 'admin'] as const).map(r => (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={`flex-1 h-9 text-sm font-medium rounded-[8px] border transition-colors capitalize ${
                      role === r
                        ? 'bg-[#1A1917] text-[#F0EFE9] border-[#1A1917]'
                        : 'bg-white text-[#6B6966] border-[#E3E1DC] hover:text-[#1A1917]'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-1">
              <button onClick={onClose} className="text-sm text-[#6B6966] hover:text-[#1A1917] transition-colors">
                Cancel
              </button>
              <button
                onClick={() => void submit()}
                disabled={!email || loading}
                className="text-sm font-medium text-[#1A1917] bg-[#C4853A] hover:bg-[#E8A855] px-4 py-2 rounded-[8px] transition-colors disabled:opacity-50"
              >
                {loading ? 'Creating…' : 'Create invitation'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function UsersTableClient({ rows: initialRows, initialInvites }: { rows: UserRow[]; initialInvites: PendingInvite[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(0)
  const [showInvite, setShowInvite] = useState(false)
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>(initialInvites)

  const handleSort = (col: SortKey) => {
    if (col === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(col); setSortDir('asc') }
    setPage(0)
  }

  const sorted = useMemo(() => {
    return [...initialRows].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'name':           cmp = a.name.localeCompare(b.name); break
        case 'role':           cmp = a.role.localeCompare(b.role); break
        case 'connectorCount': cmp = a.connectorCount - b.connectorCount; break
        case 'createdAt':      cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [initialRows, sortKey, sortDir])

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const page_ = Math.min(page, Math.max(0, totalPages - 1))
  const visible = sorted.slice(page_ * PAGE_SIZE, (page_ + 1) * PAGE_SIZE)

  const revokeInvite = async (id: string) => {
    await fetch(`/api/admin/invitations/${id}`, { method: 'DELETE' })
    setPendingInvites(prev => prev.filter(i => i.id !== id))
    toast.success('Invitation revoked')
  }

  return (
    <>
      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onInvited={inv => setPendingInvites(prev => [inv, ...prev])}
        />
      )}

      <div className="flex flex-col gap-4">
        {/* Header row with invite button */}
        <div className="flex items-center justify-between">
          <span className="text-[#9C9890] text-xs">{initialRows.length} member{initialRows.length !== 1 ? 's' : ''}</span>
          <button
            onClick={() => setShowInvite(true)}
            className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#1A1917] bg-[#C4853A] hover:bg-[#E8A855] rounded-[8px] transition-colors"
          >
            <Plus size={13} />Invite member
          </button>
        </div>

        {/* Pending invitations */}
        {pendingInvites.length > 0 && (
          <div className="bg-[#FBF3E8] border border-[#E8C88A] rounded-[10px] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#E8C88A]">
              <p className="text-[#C4853A] text-xs font-semibold uppercase tracking-[0.08em]">
                Pending invitations · {pendingInvites.length}
              </p>
            </div>
            <div className="divide-y divide-[#E8C88A]">
              {pendingInvites.map(inv => (
                <div key={inv.id} className="px-5 py-3 flex items-center gap-3">
                  <Mail size={13} className="text-[#C4853A] flex-none" />
                  <span className="text-[#1A1917] text-sm flex-1">{inv.email}</span>
                  <span className="text-[#C4853A] bg-[#FBF3E8] text-[11px] font-semibold tracking-[0.06em] uppercase px-2 py-0.5 rounded-full border border-[#E8C88A]">
                    {inv.role}
                  </span>
                  <span className="text-[#9C9890] text-xs inline-flex items-center gap-1">
                    <Clock size={11} />
                    Expires {new Date(inv.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                  <button
                    onClick={() => void revokeInvite(inv.id)}
                    className="text-[#9C9890] hover:text-[#A3352B] transition-colors"
                    title="Revoke invitation"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users table */}
        <div className="flex flex-col gap-3">
          <div className="bg-white border border-[#E3E1DC] rounded-[10px] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E3E1DC]">
                  <SortTh label="User" col="name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Role" col="role" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Connectors" col="connectorCount" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Joined" col="createdAt" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E1DC]">
                {visible.map(user => (
                  <tr key={user.id} className="hover:bg-[#F5F4F0] transition-colors">
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/users/${user.id}`} className="flex items-center gap-3 group">
                        {user.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={user.avatarUrl} alt="" className="w-7 h-7 rounded-full flex-none" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-[#C4853A] flex items-center justify-center flex-none">
                            <span className="text-[#1A1917] text-xs font-bold">{user.name.slice(0, 2).toUpperCase()}</span>
                          </div>
                        )}
                        <div>
                          <p className="text-[#1A1917] font-medium group-hover:text-[#C4853A] transition-colors">{user.name}</p>
                          <p className="text-[#6B6966] text-xs">{user.email}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      {user.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 text-[#C4853A] bg-[#FBF3E8] text-[11px] font-semibold tracking-[0.06em] uppercase px-2 py-0.5 rounded-full">
                          <Crown size={10} />Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#6B6966] bg-[#F0EFE9] text-[11px] font-semibold tracking-[0.06em] uppercase px-2 py-0.5 rounded-full">
                          <User size={10} />Member
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-[#6B6966]">{user.connectorCount}</td>
                    <td className="px-5 py-3.5 text-[#6B6966]">
                      {new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visible.length === 0 && (
              <div className="py-12 text-center text-[#9C9890] text-sm">No users yet.</div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-1">
              <span className="text-[#9C9890] text-xs">
                {page_ * PAGE_SIZE + 1}–{Math.min((page_ + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page_ === 0}
                  className="h-7 px-3 text-xs font-medium text-[#1A1917] bg-white border border-[#E3E1DC] rounded-[6px] hover:bg-[#F5F4F0] transition-colors disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-[#6B6966] text-xs">Page {page_ + 1} of {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page_ === totalPages - 1}
                  className="h-7 px-3 text-xs font-medium text-[#1A1917] bg-white border border-[#E3E1DC] rounded-[6px] hover:bg-[#F5F4F0] transition-colors disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
