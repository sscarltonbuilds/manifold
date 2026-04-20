'use client'

import { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'

export function RequestConnectorButton() {
  const [open, setOpen]           = useState(false)
  const [connector, setConnector] = useState('')
  const [message, setMessage]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const overlayRef                = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  const submit = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/connectors/request', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          connectorName: connector.trim() || undefined,
          message:       message.trim() || undefined,
        }),
      })
      if (res.ok) {
        toast.success('Request sent to your admin.')
        setOpen(false)
        setConnector('')
        setMessage('')
      } else {
        const data = await res.json() as { error?: { message?: string } }
        toast.error(data.error?.message ?? 'Failed to send request')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-[#6B6966] hover:text-[#C4853A] transition-colors flex-none"
      >
        Request a connector
      </button>

      {open && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={e => { if (e.target === overlayRef.current) setOpen(false) }}
        >
          <div
            className="bg-white rounded-[16px] shadow-lg w-full max-w-md mx-4 overflow-hidden"
            style={{ animation: 'modal-in 200ms ease-out' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E3E1DC]">
              <h2 className="text-[#1A1917] text-base font-medium">Request a connector</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-[#9C9890] hover:text-[#1A1917] transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 flex flex-col gap-4">
              <div>
                <label className="block text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em] mb-1.5">
                  What connector do you need?
                </label>
                <input
                  type="text"
                  value={connector}
                  onChange={e => setConnector(e.target.value)}
                  placeholder="e.g. Notion, Salesforce, Jira"
                  className="w-full h-9 px-3 text-sm text-[#1A1917] bg-white border border-[#E3E1DC] rounded-[8px] focus:outline-none focus:border-[#C4853A] transition-colors placeholder:text-[#9C9890]"
                />
              </div>

              <div>
                <label className="block text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em] mb-1.5">
                  Tell your admin why you need it
                </label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Describe your use case…"
                  rows={3}
                  className="w-full px-3 py-2 text-sm text-[#1A1917] bg-white border border-[#E3E1DC] rounded-[8px] focus:outline-none focus:border-[#C4853A] transition-colors placeholder:text-[#9C9890] resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 pb-5">
              <button
                onClick={() => setOpen(false)}
                className="text-sm text-[#6B6966] hover:text-[#1A1917] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={submitting}
                className="px-4 py-2 text-sm font-semibold text-[#1A1917] bg-[#C4853A] hover:bg-[#E8A855] rounded-[8px] transition-colors disabled:opacity-50"
              >
                {submitting ? 'Sending…' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.97) translateY(4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </>
  )
}
