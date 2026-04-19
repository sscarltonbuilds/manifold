'use client'

import { useState } from 'react'
import { RefreshCw, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface RefreshConnectorButtonProps {
  connectorId: string
}

export function RefreshConnectorButton({ connectorId }: RefreshConnectorButtonProps) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault() // don't follow the row link
    e.stopPropagation()
    setState('loading')

    try {
      const res = await fetch(`/api/admin/connectors/${connectorId}/refresh-tools`, { method: 'POST' })
      const data = await res.json() as { ok?: boolean; toolCount?: number }
      setState(res.ok && data.ok ? 'ok' : 'error')
      if (res.ok && data.ok) router.refresh()
    } catch {
      setState('error')
    }

    // Reset icon after 3s
    setTimeout(() => setState('idle'), 3000)
  }

  return (
    <button
      onClick={handleClick}
      disabled={state === 'loading'}
      title="Refresh tools"
      className="p-1.5 rounded-[6px] text-[#9C9890] hover:text-[#1A1917] hover:bg-[#F5F4F0] transition-colors disabled:opacity-50"
    >
      {state === 'loading' && <Loader2 size={13} className="animate-spin" />}
      {state === 'ok'      && <CheckCircle2 size={13} className="text-[#4A7C59]" />}
      {state === 'error'   && <XCircle size={13} className="text-[#A3352B]" />}
      {state === 'idle'    && <RefreshCw size={13} />}
    </button>
  )
}
