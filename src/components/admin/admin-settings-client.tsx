'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Eye, EyeOff, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

interface OAuthClient {
  clientId: string
  createdAt: string
}

interface NewCredential {
  clientId: string
  clientSecret: string
}

export function AdminSettingsClient() {
  const [clients, setClients] = useState<OAuthClient[]>([])
  const [generating, setGenerating] = useState(false)
  const [newCred, setNewCred] = useState<NewCredential | null>(null)
  const [secretVisible, setSecretVisible] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/oauth-clients')
      .then(r => r.json())
      .then((data: OAuthClient[]) => setClients(data))
  }, [])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/admin/oauth-clients', { method: 'POST' })
      const data = await res.json() as NewCredential
      setNewCred(data)
      setSecretVisible(false)
      setClients(prev => [...prev, { clientId: data.clientId, createdAt: new Date().toISOString() }])
    } finally {
      setGenerating(false)
    }
  }

  const handleRevoke = async (clientId: string) => {
    await fetch(`/api/admin/oauth-clients?clientId=${clientId}`, { method: 'DELETE' })
    setClients(prev => prev.filter(c => c.clientId !== clientId))
    toast.success('Credentials revoked')
  }

  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="bg-white border border-[#E3E1DC] rounded-[10px] p-5 flex flex-col gap-5">
      <p className="text-[#6B6966] text-sm">
        Generate Client ID and Secret pairs for MCP-compatible AI tools. Copy these into your tool&apos;s OAuth settings.
      </p>

      {/* New credential reveal */}
      {newCred && (
        <div className="bg-[#F5F4F0] border border-[#E3E1DC] rounded-[8px] p-4 flex flex-col gap-3">
          <p className="text-[#A3352B] text-xs font-semibold uppercase tracking-[0.06em]">
            Copy the secret now — it won&apos;t be shown again.
          </p>

          <div>
            <label className="text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em] mb-1 block">Client ID</label>
            <div className="flex items-center gap-2 bg-[#1A1917] rounded-[6px] px-3 py-2">
              <code className="text-[#C4853A] font-mono text-xs flex-1">{newCred.clientId}</code>
              <button onClick={() => copy(newCred.clientId, 'id')} className="text-[#9C9890] hover:text-[#C4853A] transition-colors">
                {copiedId === 'id' ? <Check size={13} className="text-[#4A7C59]" /> : <Copy size={13} />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em] mb-1 block">Client Secret</label>
            <div className="flex items-center gap-2 bg-[#1A1917] rounded-[6px] px-3 py-2">
              <code className="text-[#C4853A] font-mono text-xs flex-1 break-all">
                {secretVisible ? newCred.clientSecret : '••••••••••••••••••••••••'}
              </code>
              <button onClick={() => setSecretVisible(v => !v)} className="text-[#9C9890] hover:text-[#C4853A] transition-colors flex-none">
                {secretVisible ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
              <button onClick={() => copy(newCred.clientSecret, 'secret')} className="text-[#9C9890] hover:text-[#C4853A] transition-colors flex-none">
                {copiedId === 'secret' ? <Check size={13} className="text-[#4A7C59]" /> : <Copy size={13} />}
              </button>
            </div>
          </div>

          <button
            onClick={() => setNewCred(null)}
            className="text-xs text-[#6B6966] hover:text-[#1A1917] text-right transition-colors"
          >
            Done
          </button>
        </div>
      )}

      {/* Existing clients */}
      {clients.length > 0 && (
        <div className="flex flex-col gap-2">
          {clients.map(client => (
            <div key={client.clientId} className="flex items-center gap-3 py-2 border-b border-[#E3E1DC] last:border-0">
              <code className="text-[#6B6966] font-mono text-xs flex-1">{client.clientId}</code>
              <span className="text-[#9C9890] text-xs">
                {new Date(client.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <button
                onClick={() => handleRevoke(client.clientId)}
                className="text-[#9C9890] hover:text-[#A3352B] transition-colors"
                title="Revoke"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {clients.length === 0 && !newCred && (
        <p className="text-[#9C9890] text-sm text-center py-2">No credentials yet.</p>
      )}

      <button
        onClick={handleGenerate}
        disabled={generating}
        className="flex items-center gap-2 self-start text-sm text-[#1A1917] bg-[#C4853A] hover:bg-[#E8A855] px-4 py-2 rounded-[8px] font-semibold transition-colors disabled:opacity-50"
      >
        <Plus size={14} />
        {generating ? 'Generating…' : 'Generate new credentials'}
      </button>
    </div>
  )
}
