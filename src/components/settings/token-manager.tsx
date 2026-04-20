'use client'

import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'

interface TokenRow {
  id:        string
  name:      string | null
  clientId:  string
  createdAt: string
  expiresAt: string
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
  })
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5 border-b border-[#E3E1DC] last:border-b-0">
      <div className="h-4 w-36 bg-[#F5F4F0] rounded animate-pulse" />
      <div className="h-4 w-20 bg-[#F5F4F0] rounded animate-pulse ml-auto" />
      <div className="h-4 w-24 bg-[#F5F4F0] rounded animate-pulse" />
      <div className="h-4 w-4 bg-[#F5F4F0] rounded animate-pulse" />
    </div>
  )
}

function TokenNameCell({ token, onRenamed }: { token: TokenRow; onRenamed: (id: string, name: string) => void }) {
  const [value, setValue]   = useState(token.name ?? '')
  const [saving, setSaving] = useState(false)
  const inputRef            = useRef<HTMLInputElement>(null)

  const save = async () => {
    const trimmed = value.trim()
    if (trimmed === (token.name ?? '')) return
    setSaving(true)
    try {
      const res = await fetch(`/api/user/tokens/${token.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: trimmed }),
      })
      if (res.ok) {
        onRenamed(token.id, trimmed)
      } else {
        toast.error('Failed to rename token')
        setValue(token.name ?? '')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={e => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={e => { if (e.key === 'Enter') inputRef.current?.blur() }}
      disabled={saving}
      placeholder="Unnamed token"
      className="bg-transparent border-none outline-none text-sm text-[#1A1917] placeholder:text-[#9C9890] w-full min-w-0 disabled:opacity-60"
    />
  )
}

function RevokeButton({ tokenId, onRevoked }: { tokenId: string; onRevoked: (id: string) => void }) {
  const [confirming, setConfirming] = useState(false)
  const [revoking, setRevoking]     = useState(false)

  const revoke = async () => {
    setRevoking(true)
    try {
      const res = await fetch(`/api/user/tokens/${tokenId}`, { method: 'DELETE' })
      if (res.ok) {
        onRevoked(tokenId)
        toast.success('Token revoked')
      } else {
        toast.error('Failed to revoke token')
        setConfirming(false)
      }
    } finally {
      setRevoking(false)
    }
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-1.5 text-xs">
        <button
          onClick={revoke}
          disabled={revoking}
          className="text-[#A3352B] font-medium hover:underline disabled:opacity-50"
        >
          {revoking ? 'Revoking…' : 'Yes'}
        </button>
        <span className="text-[#9C9890]">/</span>
        <button
          onClick={() => setConfirming(false)}
          className="text-[#6B6966] hover:text-[#1A1917]"
        >
          Cancel
        </button>
      </span>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-[#9C9890] hover:text-[#A3352B] transition-colors"
      aria-label="Revoke token"
    >
      <X size={14} />
    </button>
  )
}

export function TokenManager() {
  const [tokens, setTokens]   = useState<TokenRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/user/tokens')
      .then(r => r.json())
      .then((data: { tokens: TokenRow[] }) => setTokens(data.tokens ?? []))
      .catch(() => toast.error('Failed to load tokens'))
      .finally(() => setLoading(false))
  }, [])

  const handleRenamed = (id: string, name: string) => {
    setTokens(prev => prev.map(t => t.id === id ? { ...t, name } : t))
  }

  const handleRevoked = (id: string) => {
    setTokens(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div className="bg-white border border-[#E3E1DC] rounded-[10px] overflow-hidden">
      {/* Header row */}
      <div className="px-5 py-3 border-b border-[#E3E1DC] grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center">
        <span className="text-[#6B6966] text-[11px] font-semibold uppercase tracking-[0.08em]">Name</span>
        <span className="text-[#6B6966] text-[11px] font-semibold uppercase tracking-[0.08em] w-20 text-right">Client</span>
        <span className="text-[#6B6966] text-[11px] font-semibold uppercase tracking-[0.08em] w-28 text-right">Expires</span>
        <span className="w-4" />
      </div>

      {loading ? (
        <>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </>
      ) : tokens.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-[#9C9890] text-sm">No active tokens.</p>
        </div>
      ) : (
        <div className="divide-y divide-[#E3E1DC]">
          {tokens.map(token => {
            const expired = new Date(token.expiresAt) < new Date()
            return (
              <div
                key={token.id}
                className="px-5 py-3.5 grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center"
              >
                <TokenNameCell token={token} onRenamed={handleRenamed} />

                <span
                  className="text-[#9C9890] font-mono text-[11px] w-20 text-right truncate"
                  title={token.clientId}
                >
                  {token.clientId.slice(0, 8)}…
                </span>

                <span className={`text-[12px] w-28 text-right ${expired ? 'text-[#9C9890]' : 'text-[#6B6966]'}`}>
                  {formatDate(token.expiresAt)}
                  {expired && <span className="ml-1 text-[#9C9890]">(expired)</span>}
                </span>

                <RevokeButton tokenId={token.id} onRevoked={handleRevoked} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
