'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const EMOJI_OPTIONS = ['📦','🛠️','📊','📣','💼','🎯','🔗','⚙️','🧪','📱','🌐','💡']

export function CreateBundleButton() {
  const router = useRouter()
  const [open, setOpen]               = useState(false)
  const [name, setName]               = useState('')
  const [description, setDescription] = useState('')
  const [emoji, setEmoji]             = useState('📦')
  const [loading, setLoading]         = useState(false)

  const reset = () => { setName(''); setDescription(''); setEmoji('📦') }

  const submit = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/bundles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim(), emoji }),
      })
      const data = await res.json() as { ok?: boolean; id?: string; error?: { message?: string } }
      if (!res.ok || !data.ok) { toast.error(data.error?.message ?? 'Failed to create bundle'); return }
      toast.success('Bundle created')
      setOpen(false)
      reset()
      router.push(`/admin/bundles/${data.id!}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#1A1917] bg-[#C4853A] hover:bg-[#E8A855] rounded-[8px] transition-colors"
      >
        <Plus size={13} />New bundle
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-[12px] border border-[#E3E1DC] shadow-xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E3E1DC]">
              <h2 className="text-[#1A1917] text-base font-medium">New bundle</h2>
              <button onClick={() => setOpen(false)} className="text-[#9C9890] hover:text-[#1A1917] transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-4">
              {/* Emoji picker */}
              <div>
                <label className="text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em] mb-2 block">Icon</label>
                <div className="flex flex-wrap gap-1.5">
                  {EMOJI_OPTIONS.map(e => (
                    <button
                      key={e}
                      onClick={() => setEmoji(e)}
                      className={`w-9 h-9 text-xl rounded-[6px] transition-colors ${emoji === e ? 'bg-[#FBF3E8] ring-1 ring-[#C4853A]' : 'hover:bg-[#F5F4F0]'}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em] mb-1.5 block">Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && name.trim()) void submit() }}
                  autoFocus
                  placeholder="Marketing stack"
                  className="w-full h-9 px-3 text-sm text-[#1A1917] bg-white border border-[#E3E1DC] rounded-[8px] focus:outline-none focus:border-[#C4853A] transition-colors placeholder:text-[#9C9890]"
                />
              </div>
              <div>
                <label className="text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em] mb-1.5 block">
                  Description <span className="font-normal normal-case text-[#9C9890]">(optional)</span>
                </label>
                <input
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Tools for the marketing team"
                  className="w-full h-9 px-3 text-sm text-[#1A1917] bg-white border border-[#E3E1DC] rounded-[8px] focus:outline-none focus:border-[#C4853A] transition-colors placeholder:text-[#9C9890]"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-1">
                <button onClick={() => setOpen(false)} className="text-sm text-[#6B6966] hover:text-[#1A1917] transition-colors">Cancel</button>
                <button
                  onClick={() => void submit()}
                  disabled={!name.trim() || loading}
                  className="text-sm font-medium text-[#1A1917] bg-[#C4853A] hover:bg-[#E8A855] px-4 py-2 rounded-[8px] transition-colors disabled:opacity-50"
                >
                  {loading ? 'Creating…' : 'Create bundle'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
