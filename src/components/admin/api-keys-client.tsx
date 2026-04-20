'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Copy, Check, Loader2, Key } from 'lucide-react'
import { toast } from 'sonner'

interface ApiKey {
  id:         string
  name:       string
  createdAt:  string
  lastUsedAt: string | null
}

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000)
  if (s < 60)  return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function CopyKeyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copy}
      title="Copy key"
      className="flex items-center gap-1 text-[#C4853A] hover:text-[#E8A855] transition-colors flex-none"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      <span className="text-xs">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  )
}

export function ApiKeysClient() {
  const [keys, setKeys]           = useState<ApiKey[]>([])
  const [loading, setLoading]     = useState(true)
  const [creating, setCreating]   = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [showForm, setShowForm]   = useState(false)
  const [newKey, setNewKey]       = useState<{ id: string; name: string; key: string } | null>(null)

  const loadKeys = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/api-keys')
      if (res.ok) {
        const data = await res.json() as { keys: ApiKey[] }
        setKeys(data.keys)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadKeys() }, [])

  const createKey = async () => {
    if (!nameInput.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameInput.trim() }),
      })
      if (!res.ok) {
        toast.error('Failed to generate key')
        return
      }
      const data = await res.json() as { id: string; name: string; key: string }
      setNewKey(data)
      setNameInput('')
      setShowForm(false)
      await loadKeys()
    } finally {
      setCreating(false)
    }
  }

  const revokeKey = async (id: string, name: string) => {
    if (!confirm(`Revoke "${name}"? Any CLI sessions using it will stop working.`)) return
    const res = await fetch(`/api/admin/api-keys/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('API key revoked')
      setKeys(prev => prev.filter(k => k.id !== id))
      if (newKey?.id === id) setNewKey(null)
    } else {
      toast.error('Failed to revoke key')
    }
  }

  return (
    <div className="bg-white border border-[#E3E1DC] rounded-[10px] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-[#E3E1DC]">
        <div>
          <p className="text-[#1A1917] text-sm font-medium">API Keys</p>
          <p className="text-[#9C9890] text-xs mt-0.5">
            Used by the Manifold CLI. Each key grants full admin access.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1A1917] bg-[#C4853A] hover:bg-[#E8A855] rounded-[6px] transition-colors"
          >
            <Plus size={12} />
            Generate key
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="px-5 py-4 bg-[#FAFAF9] border-b border-[#E3E1DC]">
          <p className="text-[#1A1917] text-xs font-medium mb-2">Key name</p>
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void createKey() }}
              placeholder="e.g. CI deploy key"
              className="flex-1 h-8 px-3 text-xs text-[#1A1917] bg-white border border-[#E3E1DC] rounded-[6px] focus:outline-none focus:border-[#C4853A] transition-colors placeholder:text-[#9C9890]"
            />
            <button
              onClick={createKey}
              disabled={!nameInput.trim() || creating}
              className="h-8 px-3 text-xs font-semibold text-[#1A1917] bg-[#C4853A] hover:bg-[#E8A855] rounded-[6px] transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {creating ? <Loader2 size={12} className="animate-spin" /> : null}
              Generate
            </button>
            <button
              onClick={() => { setShowForm(false); setNameInput('') }}
              className="h-8 px-2 text-xs text-[#9C9890] hover:text-[#1A1917] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* New key reveal — shown once after creation */}
      {newKey && (
        <div className="px-5 py-4 bg-[#FBF3E8] border-b border-[#E8C88A]">
          <div className="flex items-start justify-between gap-3 mb-2">
            <p className="text-[#1A1917] text-xs font-semibold">
              Key generated — copy it now
            </p>
            <button
              onClick={() => setNewKey(null)}
              className="text-[#9C9890] hover:text-[#1A1917] text-xs transition-colors"
            >
              Dismiss
            </button>
          </div>
          <p className="text-[#6B6966] text-xs mb-3">
            This is the only time this key will be shown.
          </p>
          <div className="flex items-center gap-3 bg-[#1A1917] rounded-[6px] px-3 py-2.5">
            <code className="text-[#C4853A] font-mono text-xs flex-1 break-all select-all">
              {newKey.key}
            </code>
            <CopyKeyButton text={newKey.key} />
          </div>
        </div>
      )}

      {/* Key list */}
      {loading ? (
        <div className="px-5 py-6 flex items-center justify-center">
          <Loader2 size={16} className="animate-spin text-[#9C9890]" />
        </div>
      ) : keys.length === 0 ? (
        <div className="px-5 py-8 flex flex-col items-center gap-2 text-center">
          <Key size={18} className="text-[#9C9890]" strokeWidth={1.5} />
          <p className="text-[#9C9890] text-sm">No API keys yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-[#E3E1DC]">
          {keys.map(key => (
            <div key={key.id} className="px-5 py-3.5 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-[#1A1917] text-sm font-medium truncate">{key.name}</p>
                <p className="text-[#9C9890] text-xs mt-0.5">
                  Created {timeAgo(new Date(key.createdAt))}
                  {key.lastUsedAt ? ` · Last used ${timeAgo(new Date(key.lastUsedAt))}` : ' · Never used'}
                </p>
              </div>
              <button
                onClick={() => void revokeKey(key.id, key.name)}
                title="Revoke key"
                className="text-[#9C9890] hover:text-[#A3352B] transition-colors flex-none"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
