'use client'

import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface AssignedBundle {
  bundleId:    string
  assignedAt:  string
  name:        string
  emoji:       string
  description: string
}

interface Props {
  userId:          string
  assignedBundles: AssignedBundle[]
  allBundles:      { id: string; name: string; emoji: string }[]
}

export function UserBundlesSection({ userId, assignedBundles: initial, allBundles }: Props) {
  const [assigned, setAssigned]   = useState<AssignedBundle[]>(initial)
  const [showPicker, setShowPicker] = useState(false)

  const unassigned = allBundles.filter(b => !assigned.some(a => a.bundleId === b.id))

  const assign = async (bundleId: string) => {
    const bundle = allBundles.find(b => b.id === bundleId)!
    const res = await fetch(`/api/admin/users/${userId}/bundles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bundleId }),
    })
    if (res.ok) {
      setAssigned(prev => [...prev, { bundleId, assignedAt: new Date().toISOString(), name: bundle.name, emoji: bundle.emoji, description: '' }])
      setShowPicker(false)
      toast.success(`"${bundle.name}" assigned`)
    }
  }

  const remove = async (bundleId: string) => {
    const bundle = assigned.find(b => b.bundleId === bundleId)!
    await fetch(`/api/admin/users/${userId}/bundles/${bundleId}`, { method: 'DELETE' })
    setAssigned(prev => prev.filter(b => b.bundleId !== bundleId))
    toast.success(`"${bundle.name}" removed`)
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[#1A1917] text-sm font-semibold uppercase tracking-[0.08em]">Bundles</h2>
        {unassigned.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowPicker(v => !v)}
              className="inline-flex items-center gap-1 text-xs text-[#C4853A] hover:underline"
            >
              <Plus size={12} />Assign bundle
            </button>
            {showPicker && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowPicker(false)} />
                <div className="absolute right-0 top-full mt-1 bg-white border border-[#E3E1DC] rounded-[8px] shadow-lg z-20 py-1 min-w-[180px]">
                  {unassigned.map(b => (
                    <button
                      key={b.id}
                      onClick={() => void assign(b.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#1A1917] hover:bg-[#F5F4F0] transition-colors text-left"
                    >
                      <span>{b.emoji}</span>{b.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {assigned.length === 0 ? (
        <div className="bg-white border border-[#E3E1DC] rounded-[10px] px-5 py-4 text-center">
          <p className="text-[#9C9890] text-sm">No bundles assigned. Assign a bundle to grant instant access to a set of connectors.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {assigned.map(b => (
            <div key={b.bundleId} className="bg-white border border-[#E3E1DC] rounded-[10px] px-4 py-3 flex items-center gap-3">
              <span className="text-xl">{b.emoji}</span>
              <Link href={`/admin/bundles/${b.bundleId}`} className="text-[#1A1917] text-sm font-medium hover:text-[#C4853A] transition-colors flex-1">
                {b.name}
              </Link>
              <span className="text-[#9C9890] text-xs">
                Assigned {new Date(b.assignedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
              <button onClick={() => void remove(b.bundleId)} className="text-[#9C9890] hover:text-[#A3352B] transition-colors">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
