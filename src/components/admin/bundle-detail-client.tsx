'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, X, Trash2, UserPlus, Lock } from 'lucide-react'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BundleConn {
  connectorId: string
  required:    boolean
  name:        string
  iconUrl:     string | null
  authType:    string
  managedBy:   string
}

interface AssignedUser {
  userId:     string
  assignedAt: string
  name:       string
  email:      string
  avatarUrl:  string | null
}

interface Props {
  bundle: {
    id:          string
    name:        string
    description: string
    emoji:       string
    createdAt:   string
    updatedAt:   string
  }
  bundleConnectors: BundleConn[]
  assignedUsers:    AssignedUser[]
  allConnectors: { id: string; name: string; iconUrl: string | null; authType: string; managedBy: string }[]
  allUsers:      { id: string; name: string; email: string; avatarUrl: string | null }[]
}

const EMOJI_OPTIONS = ['📦','🛠️','📊','📣','💼','🎯','🔗','⚙️','🧪','📱','🌐','💡']

export function BundleDetailClient({
  bundle,
  bundleConnectors: initialConns,
  assignedUsers: initialUsers,
  allConnectors,
  allUsers,
}: Props) {
  const router = useRouter()
  const [name, setName]               = useState(bundle.name)
  const [description, setDescription] = useState(bundle.description)
  const [emoji, setEmoji]             = useState(bundle.emoji)
  const [savingMeta, setSavingMeta]   = useState(false)

  const [conns, setConns]             = useState<BundleConn[]>(initialConns)
  const [users_, setUsers]            = useState<AssignedUser[]>(initialUsers)
  const [showAddConn, setShowAddConn] = useState(false)
  const [showAddUser, setShowAddUser] = useState(false)

  const metaDirty = name !== bundle.name || description !== bundle.description || emoji !== bundle.emoji

  const saveMeta = async () => {
    setSavingMeta(true)
    try {
      await fetch(`/api/admin/bundles/${bundle.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, emoji }),
      })
      toast.success('Bundle updated')
      router.refresh()
    } finally {
      setSavingMeta(false)
    }
  }

  const addConnector = async (connectorId: string) => {
    const existing = conns.find(c => c.connectorId === connectorId)
    if (existing) return
    const connector = allConnectors.find(c => c.id === connectorId)!
    const newConns = [...conns, { connectorId, required: false, name: connector.name, iconUrl: connector.iconUrl, authType: connector.authType, managedBy: connector.managedBy }]
    await fetch(`/api/admin/bundles/${bundle.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectors: newConns.map(c => ({ connectorId: c.connectorId, required: c.required })) }),
    })
    setConns(newConns)
    setShowAddConn(false)
    toast.success('Connector added')
  }

  const removeConnector = async (connectorId: string) => {
    const newConns = conns.filter(c => c.connectorId !== connectorId)
    await fetch(`/api/admin/bundles/${bundle.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectors: newConns.map(c => ({ connectorId: c.connectorId, required: c.required })) }),
    })
    setConns(newConns)
    toast.success('Connector removed')
  }

  const toggleRequired = async (connectorId: string) => {
    const newConns = conns.map(c => c.connectorId === connectorId ? { ...c, required: !c.required } : c)
    await fetch(`/api/admin/bundles/${bundle.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectors: newConns.map(c => ({ connectorId: c.connectorId, required: c.required })) }),
    })
    setConns(newConns)
  }

  const assignUser = async (userId: string) => {
    const res = await fetch(`/api/admin/users/${userId}/bundles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bundleId: bundle.id }),
    })
    if (res.ok) {
      const user = allUsers.find(u => u.id === userId)!
      setUsers(prev => [...prev, { userId, assignedAt: new Date().toISOString(), name: user.name, email: user.email, avatarUrl: user.avatarUrl }])
      setShowAddUser(false)
      toast.success(`Bundle assigned to ${user.name}`)
    }
  }

  const removeUser = async (userId: string) => {
    await fetch(`/api/admin/users/${userId}/bundles/${bundle.id}`, { method: 'DELETE' })
    setUsers(prev => prev.filter(u => u.userId !== userId))
    toast.success('Bundle removed from user')
  }

  const deleteBundle = async () => {
    if (!confirm(`Delete bundle "${bundle.name}"? Users will lose access to auto-provisioned connectors.`)) return
    await fetch(`/api/admin/bundles/${bundle.id}`, { method: 'DELETE' })
    toast.success('Bundle deleted')
    router.push('/admin/bundles')
  }

  const unassignedConnectors = allConnectors.filter(c => !conns.some(bc => bc.connectorId === c.id))
  const unassignedUsers      = allUsers.filter(u => !users_.some(bu => bu.userId === u.id))

  return (
    <div className="flex flex-col gap-6">
      {/* Bundle header / meta */}
      <div className="bg-white border border-[#E3E1DC] rounded-[10px] p-6">
        <div className="flex items-start gap-4 mb-5">
          {/* Emoji picker inline */}
          <div className="relative group/emoji">
            <button className="text-4xl w-14 h-14 rounded-[10px] bg-[#F5F4F0] flex items-center justify-center hover:bg-[#EBE9E3] transition-colors">
              {emoji}
            </button>
            {/* On hover show picker */}
            <div className="absolute top-full left-0 mt-1 bg-white border border-[#E3E1DC] rounded-[8px] p-2 shadow-lg z-10 hidden group-hover/emoji:flex flex-wrap gap-1 w-48">
              {EMOJI_OPTIONS.map(e => (
                <button key={e} onClick={() => setEmoji(e)} className={`w-9 h-9 text-xl rounded-[6px] transition-colors ${emoji === e ? 'bg-[#FBF3E8]' : 'hover:bg-[#F5F4F0]'}`}>{e}</button>
              ))}
            </div>
          </div>
          <div className="flex-1">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full text-[#1A1917] text-xl font-medium bg-transparent focus:outline-none border-b border-transparent focus:border-[#C4853A] transition-colors pb-0.5"
            />
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add a description…"
              className="w-full text-[#6B6966] text-sm bg-transparent focus:outline-none border-b border-transparent focus:border-[#C4853A] transition-colors mt-1 pb-0.5 placeholder:text-[#C4B8B0]"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          {metaDirty && (
            <button
              onClick={() => void saveMeta()}
              disabled={savingMeta}
              className="text-sm font-medium text-[#1A1917] bg-[#C4853A] hover:bg-[#E8A855] px-4 py-2 rounded-[8px] transition-colors disabled:opacity-50"
            >
              {savingMeta ? 'Saving…' : 'Save changes'}
            </button>
          )}
          <button onClick={() => void deleteBundle()} className="ml-auto inline-flex items-center gap-1.5 text-sm text-[#9C9890] hover:text-[#A3352B] transition-colors">
            <Trash2 size={13} />Delete bundle
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Connectors */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[#1A1917] text-sm font-semibold uppercase tracking-[0.08em]">
              Connectors <span className="text-[#9C9890] font-normal normal-case tracking-normal">({conns.length})</span>
            </h2>
            {unassignedConnectors.length > 0 && (
              <button onClick={() => setShowAddConn(v => !v)} className="inline-flex items-center gap-1 text-xs text-[#C4853A] hover:underline">
                <Plus size={12} />Add connector
              </button>
            )}
          </div>

          {showAddConn && (
            <div className="bg-[#F5F4F0] border border-[#E3E1DC] rounded-[8px] p-3 flex flex-col gap-1 max-h-52 overflow-y-auto">
              {unassignedConnectors.map(c => (
                <button
                  key={c.id}
                  onClick={() => void addConnector(c.id)}
                  className="flex items-center gap-2.5 px-2 py-2 rounded-[6px] hover:bg-white transition-colors text-left"
                >
                  {c.iconUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.iconUrl} alt="" className="w-4 h-4 object-contain" />
                  ) : (
                    <div className="w-4 h-4 rounded bg-[#1A1917]" />
                  )}
                  <span className="text-[#1A1917] text-sm">{c.name}</span>
                  <span className="ml-auto text-[#9C9890] text-xs font-mono">{c.authType}</span>
                </button>
              ))}
            </div>
          )}

          <div className="bg-white border border-[#E3E1DC] rounded-[10px] overflow-hidden">
            {conns.length === 0 ? (
              <div className="px-5 py-8 text-center text-[#9C9890] text-sm">No connectors yet. Add some above.</div>
            ) : (
              <div className="divide-y divide-[#E3E1DC]">
                {conns.map(c => (
                  <div key={c.connectorId} className="px-5 py-3 flex items-center gap-3">
                    {c.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.iconUrl} alt="" className="w-5 h-5 object-contain flex-none" />
                    ) : (
                      <div className="w-5 h-5 rounded bg-[#1A1917] flex-none" />
                    )}
                    <span className="text-[#1A1917] text-sm flex-1">{c.name}</span>
                    {/* Required toggle */}
                    <button
                      onClick={() => void toggleRequired(c.connectorId)}
                      title={c.required ? 'Required — click to make optional' : 'Optional — click to make required'}
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.06em] px-2 py-0.5 rounded-full transition-colors ${
                        c.required
                          ? 'text-[#A3352B] bg-[#FDF2F2] hover:bg-[#F5C6C6]'
                          : 'text-[#9C9890] bg-[#F5F4F0] hover:bg-[#E3E1DC]'
                      }`}
                    >
                      {c.required ? <><Lock size={9} />Required</> : 'Optional'}
                    </button>
                    <button onClick={() => void removeConnector(c.connectorId)} className="text-[#9C9890] hover:text-[#A3352B] transition-colors">
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Assigned users */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[#1A1917] text-sm font-semibold uppercase tracking-[0.08em]">
              Assigned users <span className="text-[#9C9890] font-normal normal-case tracking-normal">({users_.length})</span>
            </h2>
            {unassignedUsers.length > 0 && (
              <button onClick={() => setShowAddUser(v => !v)} className="inline-flex items-center gap-1 text-xs text-[#C4853A] hover:underline">
                <UserPlus size={12} />Assign user
              </button>
            )}
          </div>

          {showAddUser && (
            <div className="bg-[#F5F4F0] border border-[#E3E1DC] rounded-[8px] p-3 flex flex-col gap-1 max-h-52 overflow-y-auto">
              {unassignedUsers.map(u => (
                <button
                  key={u.id}
                  onClick={() => void assignUser(u.id)}
                  className="flex items-center gap-2.5 px-2 py-2 rounded-[6px] hover:bg-white transition-colors text-left"
                >
                  {u.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[#C4853A] flex items-center justify-center text-[#1A1917] text-xs font-bold">
                      {u.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-[#1A1917] text-sm">{u.name}</p>
                    <p className="text-[#9C9890] text-xs">{u.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="bg-white border border-[#E3E1DC] rounded-[10px] overflow-hidden">
            {users_.length === 0 ? (
              <div className="px-5 py-8 text-center text-[#9C9890] text-sm">No users assigned. Assign from the Users page or above.</div>
            ) : (
              <div className="divide-y divide-[#E3E1DC]">
                {users_.map(u => (
                  <div key={u.userId} className="px-5 py-3 flex items-center gap-3">
                    {u.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.avatarUrl} alt="" className="w-7 h-7 rounded-full flex-none" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-[#C4853A] flex items-center justify-center flex-none text-[#1A1917] text-xs font-bold">
                        {u.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <Link href={`/admin/users/${u.userId}`} className="text-[#1A1917] text-sm font-medium hover:text-[#C4853A] transition-colors">
                        {u.name}
                      </Link>
                      <p className="text-[#9C9890] text-xs">{u.email}</p>
                    </div>
                    <button onClick={() => void removeUser(u.userId)} className="text-[#9C9890] hover:text-[#A3352B] transition-colors" title="Remove from bundle">
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
