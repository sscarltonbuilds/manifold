'use client'

import { useState } from 'react'
import { toast } from 'sonner'

interface Props {
  userId: string
  currentRole: 'member' | 'admin'
}

export function AdminUserRoleToggle({ userId, currentRole }: Props) {
  const [role, setRole] = useState(currentRole)
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const targetRole = role === 'admin' ? 'member' : 'admin'

  const handleConfirm = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: targetRole }),
      })
      const data = await res.json() as { ok?: boolean; error?: { message?: string } }
      if (!res.ok) {
        toast.error(data.error?.message ?? 'Failed to update role')
        return
      }
      setRole(targetRole)
      toast.success(`Role changed to ${targetRole}`)
    } finally {
      setLoading(false)
      setConfirming(false)
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-[#6B6966]">Change to {targetRole}?</span>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="text-[#C4853A] font-medium hover:underline disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Confirm'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-[#9C9890] hover:text-[#1A1917]"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-sm text-[#6B6966] hover:text-[#C4853A] border border-[#E3E1DC] hover:border-[#C4853A] px-3 py-1.5 rounded-lg transition-colors"
    >
      {role === 'admin' ? 'Remove admin' : 'Make admin'}
    </button>
  )
}
