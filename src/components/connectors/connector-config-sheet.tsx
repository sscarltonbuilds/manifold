'use client'

import { useState, useEffect } from 'react'
import { X, Lock, CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import type { AuthField } from '@/lib/manifest'

interface ConnectorConfigSheetProps {
  connectorId:    string
  connectorName:  string
  connectorIcon:  React.ReactNode
  authFields:     AuthField[]
  open:           boolean
  onClose:        () => void
  onSaved:        () => void
  apiBase?:       string
}

type TestState = 'idle' | 'loading' | 'success' | 'error'

export function ConnectorConfigSheet({
  connectorId,
  connectorName,
  connectorIcon,
  authFields,
  open,
  onClose,
  onSaved,
  apiBase,
}: ConnectorConfigSheetProps) {
  const configUrl = `${apiBase ?? '/api/connectors'}/${connectorId}/config`

  const [values, setValues]               = useState<Record<string, string>>({})
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set())
  const [configured, setConfigured]       = useState(false)
  const [saving, setSaving]               = useState(false)
  const [deleting, setDeleting]           = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [testState, setTestState]         = useState<TestState>('idle')
  const [testMessage, setTestMessage]     = useState('')

  useEffect(() => {
    if (!open) return
    setChangedFields(new Set())
    setTestState('idle')
    setShowConfirmDelete(false)

    fetch(configUrl)
      .then(r => r.json())
      .then((data: { configured: boolean; config?: Record<string, string> }) => {
        setConfigured(data.configured)
        if (data.configured && data.config) {
          setValues(data.config)
        } else {
          setValues({})
        }
      })
  }, [open, configUrl])

  const handleChange = (key: string, value: string) => {
    setValues(v => ({ ...v, [key]: value }))
    setChangedFields(s => new Set(s).add(key))
    setTestState('idle')
  }

  const handleSecretChange = (key: string) => {
    setValues(v => ({ ...v, [key]: '' }))
    setChangedFields(s => new Set(s).add(key))
  }

  const getSubmitValues = () => {
    const result: Record<string, string> = {}
    for (const field of authFields) {
      const val = values[field.key]
      if (field.secret && val === '••••••••' && !changedFields.has(field.key)) continue
      if (val !== undefined) result[field.key] = val
    }
    return result
  }

  // If the connector is already configured and the user hasn't touched any fields,
  // test using the saved credentials from the server rather than masked form values.
  const useSavedTest = configured && changedFields.size === 0

  const handleTest = async () => {
    setTestState('loading')
    setTestMessage('')
    try {
      const res = useSavedTest
        ? await fetch(`/api/connectors/${connectorId}/test-saved`, { method: 'POST' })
        : await fetch(`/api/connectors/${connectorId}/test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(getSubmitValues()),
          })
      const data = await res.json() as { ok: boolean; message?: string }
      setTestState(data.ok ? 'success' : 'error')
      setTestMessage(data.message ?? '')
    } catch {
      setTestState('error')
      setTestMessage('Could not reach the server')
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(configUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getSubmitValues()),
      })
      if (!res.ok) {
        const err = await res.json() as { error?: { message?: string } }
        toast.error(err.error?.message ?? 'Failed to save')
        return
      }
      toast.success('Credentials saved')
      setConfigured(true)
      setChangedFields(new Set())
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await fetch(configUrl, { method: 'DELETE' })
      toast.success('Credentials removed')
      setConfigured(false)
      setValues({})
      setChangedFields(new Set())
      setShowConfirmDelete(false)
      onSaved()
    } finally {
      setDeleting(false)
    }
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      <div
        className="fixed right-0 top-0 h-full w-[420px] bg-[#F5F4F0] z-50 flex flex-col shadow-2xl"
        style={{ animation: 'slideIn 220ms ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-[#E3E1DC]">
          <div className="w-9 h-9 bg-[#1A1917] rounded-[8px] flex items-center justify-center flex-none">
            {connectorIcon}
          </div>
          <h2 className="text-[#1A1917] text-base font-medium flex-1">{connectorName}</h2>
          <button onClick={onClose} className="text-[#6B6966] hover:text-[#1A1917] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">
          {authFields.map(field => {
            const value    = values[field.key] ?? ''
            const isMasked = field.secret && value === '••••••••' && !changedFields.has(field.key)

            return (
              <div key={field.key} className="flex flex-col gap-1.5">
                <label className="text-[#1A1917] text-xs font-semibold uppercase tracking-[0.08em]">
                  {field.label}
                  {field.required && <span className="text-[#C4853A] ml-0.5">*</span>}
                </label>

                {field.description && (
                  <p className="text-[#6B6966] text-xs">{field.description}</p>
                )}

                {field.docsUrl && (
                  <a
                    href={field.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#C4853A] text-xs hover:underline w-fit"
                  >
                    Where to find this →
                  </a>
                )}

                {isMasked ? (
                  <div className="flex items-center gap-3 bg-white border border-[#E3E1DC] rounded-[8px] px-3 py-2.5">
                    <Lock size={13} className="text-[#9C9890] flex-none" />
                    <span className="text-[#9C9890] text-sm flex-1 font-mono tracking-widest">••••••••</span>
                    <button
                      onClick={() => handleSecretChange(field.key)}
                      className="text-[#C4853A] text-xs hover:underline"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <input
                    type={field.type === 'password' ? 'password' : field.type === 'url' ? 'url' : 'text'}
                    value={value}
                    onChange={e => handleChange(field.key, e.target.value)}
                    placeholder={field.label}
                    autoComplete="off"
                    className="bg-white border border-[#E3E1DC] focus:border-[#C4853A] rounded-[8px] px-3 py-2.5 text-sm text-[#1A1917] outline-none transition-colors"
                  />
                )}
              </div>
            )
          })}

          {/* Test connection */}
          <div className="pt-1">
            <button
              onClick={handleTest}
              disabled={testState === 'loading'}
              className="flex items-center gap-2 text-sm text-[#6B6966] hover:text-[#1A1917] transition-colors disabled:opacity-50"
            >
              {testState === 'loading' && <Loader2 size={14} className="animate-spin" />}
              {testState === 'success' && <CheckCircle2 size={14} className="text-[#4A7C59]" />}
              {testState === 'error'   && <XCircle size={14} className="text-[#A3352B]" />}
              {testState === 'idle'    && <span className="w-3.5" />}
              Test connection
            </button>
            {testMessage && (
              <p className={`text-xs mt-1 ml-5 ${testState === 'success' ? 'text-[#4A7C59]' : 'text-[#A3352B]'}`}>
                {testMessage}
              </p>
            )}
            {testState === 'success' && !testMessage && (
              <p className="text-xs mt-1 ml-5 text-[#4A7C59]">Connection successful</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E3E1DC] flex items-center justify-between gap-3">
          {configured && !showConfirmDelete && (
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="text-sm text-[#6B6966] hover:text-[#A3352B] transition-colors"
            >
              Remove credentials
            </button>
          )}

          {showConfirmDelete && (
            <div className="flex items-center gap-2">
              <AlertTriangle size={13} className="text-[#A3352B]" />
              <span className="text-xs text-[#A3352B]">Sure?</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs text-[#A3352B] font-medium hover:underline disabled:opacity-50"
              >
                {deleting ? 'Removing…' : 'Remove'}
              </button>
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="text-xs text-[#6B6966] hover:text-[#1A1917]"
              >
                Cancel
              </button>
            </div>
          )}

          {!showConfirmDelete && <div className="flex-1" />}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-[#1A1917] border border-[#E3E1DC] bg-white rounded-[8px] hover:bg-[#F5F4F0] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm text-[#1A1917] bg-[#C4853A] hover:bg-[#E8A855] rounded-[8px] font-semibold transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </>
  )
}
