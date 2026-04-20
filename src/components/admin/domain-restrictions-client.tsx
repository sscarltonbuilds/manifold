'use client'

import { useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  primaryDomain: string  // from ALLOWED_EMAIL_DOMAIN env var — read-only
}

export function DomainRestrictionsClient({ primaryDomain }: Props) {
  const [extraDomains, setExtraDomains] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/org-settings')
      .then(r => r.json())
      .then((data: { settings: Record<string, string> }) => {
        try {
          const domains = JSON.parse(data.settings.allowed_domains ?? '[]') as string[]
          setExtraDomains(domains)
        } catch { /* ignore */ }
      })
  }, [])

  const save = async (newDomains: string[]) => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/org-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'allowed_domains', value: JSON.stringify(newDomains) }),
      })
      if (res.ok) {
        toast.success('Domain allowlist updated')
      } else {
        toast.error('Failed to update')
      }
    } finally {
      setSaving(false)
    }
  }

  const add = () => {
    const d = input.trim().replace(/^@/, '').toLowerCase()
    if (!d || extraDomains.includes(d) || d === primaryDomain) return
    const next = [...extraDomains, d]
    setExtraDomains(next)
    setInput('')
    void save(next)
  }

  const remove = (domain: string) => {
    const next = extraDomains.filter(d => d !== domain)
    setExtraDomains(next)
    void save(next)
  }

  return (
    <div className="bg-white border border-[#E3E1DC] rounded-[10px] p-5 flex flex-col gap-4">
      <p className="text-[#6B6966] text-sm">
        Control which email domains can sign in. The primary domain is set by the server environment.
      </p>

      {/* Primary domain (env) */}
      <div>
        <p className="text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em] mb-2">Primary domain</p>
        <div className="flex items-center gap-2 bg-[#F5F4F0] border border-[#E3E1DC] rounded-[8px] px-3 py-2">
          <code className="text-[#1A1917] font-mono text-sm">@{primaryDomain}</code>
          <span className="ml-auto text-[10px] text-[#9C9890] font-semibold uppercase tracking-[0.06em]">Env var</span>
        </div>
      </div>

      {/* Additional domains */}
      <div>
        <p className="text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em] mb-2">Additional domains</p>
        <div className="flex flex-col gap-2">
          {extraDomains.map(d => (
            <div key={d} className="flex items-center gap-2 bg-[#F5F4F0] border border-[#E3E1DC] rounded-[8px] px-3 py-2">
              <code className="text-[#1A1917] font-mono text-sm flex-1">@{d}</code>
              <button
                onClick={() => remove(d)}
                disabled={saving}
                className="text-[#9C9890] hover:text-[#A3352B] transition-colors"
              >
                <X size={13} />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center bg-white border border-[#E3E1DC] rounded-[8px] px-3 h-9 focus-within:border-[#C4853A] transition-colors">
              <span className="text-[#9C9890] font-mono text-sm mr-1">@</span>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') add() }}
                placeholder="example.com"
                className="flex-1 bg-transparent text-[#1A1917] font-mono text-sm focus:outline-none placeholder:text-[#9C9890]"
              />
            </div>
            <button
              onClick={add}
              disabled={!input.trim() || saving}
              className="h-9 px-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#1A1917] bg-[#C4853A] hover:bg-[#E8A855] rounded-[8px] transition-colors disabled:opacity-40"
            >
              <Plus size={13} />Add
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
