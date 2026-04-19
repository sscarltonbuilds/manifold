'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, X, Loader2, CheckCircle2, AlertCircle, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { ManifestSchema } from '@/lib/manifest'
import { HelpTooltip } from '@/components/shared/help-tooltip'

type Mode = 'closed' | 'url' | 'json'

interface ValidationResult {
  ok: boolean
  preview?: {
    id: string
    name: string
    description: string
    version: string
    authType: string
    endpoint: string
  }
  errors?: Array<{ path: string; message: string }>
  parseError?: string
}

function validateJson(raw: string): ValidationResult {
  if (!raw.trim()) return { ok: false }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    return { ok: false, parseError: (e as Error).message }
  }

  const result = ManifestSchema.safeParse(parsed)
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.issues.map(i => ({
        path:    i.path.join('.') || 'root',
        message: i.message,
      })),
    }
  }

  const m = result.data
  return {
    ok: true,
    preview: {
      id:          m.id,
      name:        m.name,
      description: m.description,
      version:     m.version,
      authType:    m.auth.type,
      endpoint:    m.endpoint,
    },
  }
}

export function AddConnectorButton() {
  const router   = useRouter()
  const [mode, setMode]             = useState<Mode>('closed')
  const [manifestUrl, setManifestUrl] = useState('')
  const [manifestJson, setManifestJson] = useState('')
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Live JSON validation with debounce
  useEffect(() => {
    if (mode !== 'json') return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!manifestJson.trim()) { setValidation(null); return }

    debounceRef.current = setTimeout(() => {
      setValidation(validateJson(manifestJson))
    }, 350)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [manifestJson, mode])

  const close = () => {
    setMode('closed')
    setManifestUrl('')
    setManifestJson('')
    setValidation(null)
    setError('')
  }

  const submit = async () => {
    setLoading(true)
    setError('')
    try {
      let body: Record<string, unknown>
      if (mode === 'url') {
        body = { manifestUrl }
      } else {
        let parsed: unknown
        try {
          parsed = JSON.parse(manifestJson)
        } catch {
          setError('Invalid JSON — check syntax and try again.')
          return
        }
        body = { manifest: parsed }
      }

      const res = await fetch('/api/admin/connectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json() as {
        ok?: boolean
        connector?: { name: string; toolCount: number }
        error?: { message?: string }
      }

      if (!res.ok || !data.ok) {
        setError(data.error?.message ?? 'Failed to register connector.')
        return
      }

      toast.success(`${data.connector?.name} registered — ${data.connector?.toolCount} tools discovered`)
      close()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = mode === 'url'
    ? manifestUrl.trim().length > 0
    : (validation?.ok ?? false)

  if (mode === 'closed') {
    return (
      <button
        onClick={() => setMode('url')}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#C4853A] hover:bg-[#E8A855] text-[#1A1917] text-sm font-semibold rounded-[8px] transition-colors"
      >
        <Plus size={14} />Add connector
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
      <div
        className="bg-[#F5F4F0] rounded-[12px] w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]"
        style={{ animation: 'fadeIn 200ms ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E3E1DC] flex-none">
          <h2 className="text-[#1A1917] text-base font-medium">Add connector</h2>
          <button onClick={close} className="text-[#6B6966] hover:text-[#1A1917] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b border-[#E3E1DC] flex-none">
          {(['url', 'json'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError('') }}
              className={`px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] transition-colors border-b-2 -mb-px ${
                mode === m
                  ? 'text-[#C4853A] border-[#C4853A]'
                  : 'text-[#9C9890] border-transparent hover:text-[#1A1917]'
              }`}
            >
              {m === 'url' ? 'From URL' : 'Paste JSON'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="px-6 py-6 flex flex-col gap-4 overflow-y-auto">
          {mode === 'url' ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1">
                <label className="text-[#1A1917] text-xs font-semibold uppercase tracking-[0.08em]">
                  Manifest URL
                </label>
                <HelpTooltip docsHref="https://github.com/your-org/manifold/blob/main/docs/connectors.md">
                  A URL pointing to a <code className="font-mono">manifold.json</code> file hosted
                  alongside the connector&apos;s MCP server. Manifold fetches it, validates the
                  schema, then connects to the endpoint to discover tools automatically.
                </HelpTooltip>
              </div>
              <p className="text-[#6B6966] text-xs">
                Paste the URL to a <code className="font-mono text-[#1A1917]">manifold.json</code> file.
              </p>
              <div className="flex items-center gap-2 bg-white border border-[#E3E1DC] focus-within:border-[#C4853A] rounded-[8px] px-3 py-2.5 transition-colors">
                <Link2 size={14} className="text-[#9C9890] flex-none" />
                <input
                  type="url"
                  value={manifestUrl}
                  onChange={e => { setManifestUrl(e.target.value); setError('') }}
                  placeholder="https://your-connector.example.com/manifold.json"
                  className="flex-1 text-sm text-[#1A1917] outline-none font-mono bg-transparent"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1">
                <label className="text-[#1A1917] text-xs font-semibold uppercase tracking-[0.08em]">
                  Manifest JSON
                </label>
                <HelpTooltip docsHref="https://github.com/your-org/manifold/blob/main/docs/connectors.md">
                  Paste the full contents of a <code className="font-mono">manifold.json</code> file.
                  Manifold validates the schema as you type — errors appear inline before you submit.
                </HelpTooltip>
              </div>
              <textarea
                value={manifestJson}
                onChange={e => { setManifestJson(e.target.value); setError('') }}
                placeholder={'{\n  "manifestVersion": "1",\n  "id": "my-connector",\n  "name": "My Connector",\n  "version": "1.0.0",\n  "description": "...",\n  "endpoint": "https://...",\n  "auth": { "type": "none" }\n}'}
                rows={9}
                className="bg-white border border-[#E3E1DC] focus:border-[#C4853A] rounded-[8px] px-3 py-2.5 text-xs text-[#1A1917] outline-none font-mono resize-none transition-colors"
              />

              {/* Live validation feedback */}
              {manifestJson.trim() && validation && (
                <div className="flex flex-col gap-2">
                  {validation.parseError && (
                    <div className="flex items-start gap-2 text-xs text-[#A3352B] bg-[#FDF2F2] border border-[#F5C6C6] rounded-[6px] px-3 py-2">
                      <AlertCircle size={13} className="flex-none mt-0.5" />
                      <span>JSON syntax error: {validation.parseError}</span>
                    </div>
                  )}

                  {validation.errors && validation.errors.length > 0 && (
                    <div className="bg-[#FDF2F2] border border-[#F5C6C6] rounded-[6px] px-3 py-2.5 flex flex-col gap-1.5">
                      <p className="text-[#A3352B] text-xs font-semibold flex items-center gap-1.5">
                        <AlertCircle size={12} />
                        {validation.errors.length} validation error{validation.errors.length !== 1 ? 's' : ''}
                      </p>
                      {validation.errors.map((e, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs text-[#A3352B]">
                          <code className="font-mono bg-[#FAE0DE] px-1 rounded text-[10px] flex-none mt-0.5">{e.path}</code>
                          <span>{e.message}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {validation.ok && validation.preview && (
                    <div className="bg-[#F0F7F3] border border-[#C8E6D4] rounded-[8px] px-4 py-3 flex flex-col gap-2">
                      <p className="text-[#4A7C59] text-xs font-semibold flex items-center gap-1.5">
                        <CheckCircle2 size={12} />
                        Valid manifest
                      </p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                        <div>
                          <span className="text-[#6B6966]">ID </span>
                          <code className="text-[#1A1917] font-mono">{validation.preview.id}</code>
                        </div>
                        <div>
                          <span className="text-[#6B6966]">Version </span>
                          <code className="text-[#1A1917] font-mono">{validation.preview.version}</code>
                        </div>
                        <div className="col-span-2">
                          <span className="text-[#6B6966]">Name </span>
                          <span className="text-[#1A1917] font-medium">{validation.preview.name}</span>
                        </div>
                        <div>
                          <span className="text-[#6B6966]">Auth </span>
                          <code className="text-[#1A1917] font-mono">{validation.preview.authType}</code>
                        </div>
                        <div className="col-span-2 truncate">
                          <span className="text-[#6B6966]">Endpoint </span>
                          <code className="text-[#1A1917] font-mono text-[10px]">{validation.preview.endpoint}</code>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-[#A3352B] text-xs bg-[#FDF2F2] border border-[#F5C6C6] rounded-[6px] px-3 py-2">
              <AlertCircle size={13} className="flex-none mt-0.5" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E3E1DC] flex justify-end gap-2 flex-none">
          <button
            onClick={close}
            className="px-4 py-2 text-sm text-[#1A1917] border border-[#E3E1DC] bg-white rounded-[8px] hover:bg-[#F5F4F0] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading || !canSubmit}
            className="px-4 py-2 text-sm text-[#1A1917] bg-[#C4853A] hover:bg-[#E8A855] rounded-[8px] font-semibold transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {loading && <Loader2 size={13} className="animate-spin" />}
            {loading ? 'Registering…' : 'Register connector'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
