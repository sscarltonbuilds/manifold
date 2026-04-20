'use client'

import { useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Loader2, Trash2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import type { ChangeEvent } from 'react'
import { CopyButton } from '@/components/shared/copy-button'
import { AnimatedUnderlineTabs } from '@/components/ui/animated-tabs'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000)
  if (s < 60)  return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ---------------------------------------------------------------------------
// Toggle — single canonical design used everywhere in this file
// ---------------------------------------------------------------------------

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-[22px] rounded-full transition-colors duration-150 flex-none overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C4853A] ${
        checked ? 'bg-[#C4853A]' : 'bg-[#3A3836]'
      }`}
    >
      <span
        className={`absolute top-[3px] left-0 w-4 h-4 rounded-full bg-white ring-1 ring-black/10 transition-transform duration-150 ${
          checked ? 'translate-x-[21px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Health badge
// ---------------------------------------------------------------------------

function HealthBadge({
  status,
  lastCheck,
}: {
  status: string | null
  lastCheck: string | null
}) {
  const isHealthy    = status === 'healthy'
  const isUnhealthy  = status === 'unreachable'
  const isUnknown    = !status

  return (
    <div className="flex items-center gap-2.5">
      {/* Dot with glow on healthy */}
      <span className="relative flex-none flex items-center justify-center w-3 h-3">
        {isHealthy && (
          <span className="absolute w-3 h-3 rounded-full bg-[#4A7C59] opacity-20 animate-ping" />
        )}
        <span
          className={`relative w-2 h-2 rounded-full ${
            isHealthy   ? 'bg-[#4A7C59]' :
            isUnhealthy ? 'bg-[#A3352B]' :
            'bg-[#9C9890]'
          }`}
        />
      </span>

      {/* Label */}
      <span className={`text-sm font-medium ${
        isHealthy   ? 'text-[#4A7C59]' :
        isUnhealthy ? 'text-[#A3352B]' :
        'text-[#9C9890]'
      }`}>
        {isHealthy ? 'Healthy' : isUnhealthy ? 'Unreachable' : 'Not checked'}
      </span>

      {/* Context */}
      {lastCheck ? (
        <span className="text-[#9C9890] text-xs">
          · checked {timeAgo(new Date(lastCheck))}
        </span>
      ) : (
        <span className="text-[#9C9890] text-xs">· run a refresh to check</span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  if (status === 'active') return (
    <span className="text-[#4A7C59] bg-[#EBF5EF] text-[11px] font-semibold tracking-[0.06em] uppercase px-2 py-0.5 rounded-full">
      Active
    </span>
  )
  if (status === 'deprecated') return (
    <span className="text-[#9C9890] bg-[#F5F4F0] text-[11px] font-semibold tracking-[0.06em] uppercase px-2 py-0.5 rounded-full">
      Deprecated
    </span>
  )
  return (
    <span className="text-[#C4853A] bg-[#FBF3E8] text-[11px] font-semibold tracking-[0.06em] uppercase px-2 py-0.5 rounded-full">
      {status}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = 'overview' | 'tools' | 'policy' | 'credentials'

interface ConnectorDetailProps {
  connector: {
    id:                string
    name:              string
    status:            string
    endpoint:          string
    authType:          string
    managedBy:         string
    iconUrl:           string | null
    manifest:          unknown
    discoveredTools:   Array<{ name: string; description: string }> | null
    toolsDiscoveredAt: string | null
    toolsChangedAt:    string | null
    healthStatus:      string | null
    lastHealthCheck:   string | null
    createdAt:         string
  }
  policy: {
    required:         boolean
    logToolCalls:     boolean
    disabledTools:    string[]
    rateLimitPerHour: Record<string, number> | null
  } | null
  enabledCount: number
}

// ---------------------------------------------------------------------------
// Icon editor
// ---------------------------------------------------------------------------

function IconEditor({
  connectorId,
  currentIconUrl,
  onSaved,
}: {
  connectorId:    string
  currentIconUrl: string | null
  onSaved:        () => void
}) {
  const [editing, setEditing]   = useState(false)
  const [mode, setMode]         = useState<'url' | 'upload'>('url')
  const [urlInput, setUrlInput] = useState('')
  const [saving, setSaving]     = useState(false)

  const save = async (iconUrl: string | null) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/connectors/${connectorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ iconUrl }),
      })
      if (res.ok) {
        toast.success(iconUrl ? 'Icon updated' : 'Icon removed')
        setEditing(false)
        onSaved()
      } else {
        toast.error('Failed to update icon')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => { void save(reader.result as string) }
    reader.readAsDataURL(file)
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-3">
        {currentIconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentIconUrl} alt="icon" className="w-8 h-8 object-contain rounded" />
        ) : (
          <div className="w-8 h-8 rounded bg-[#1A1917] flex-none" />
        )}
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-[#C4853A] hover:underline"
        >
          Change icon
        </button>
        {currentIconUrl && (
          <button
            onClick={() => void save(null)}
            className="text-xs text-[#9C9890] hover:text-[#A3352B] transition-colors"
          >
            Remove
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 flex-1">
      <div className="flex gap-2">
        {(['url', 'upload'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3 py-1 text-xs font-medium rounded-[6px] transition-colors capitalize ${
              mode === m ? 'bg-[#1A1917] text-[#F0EFE9]' : 'text-[#6B6966] hover:text-[#1A1917]'
            }`}
          >
            {m === 'url' ? 'Paste URL' : 'Upload file'}
          </button>
        ))}
      </div>

      {mode === 'url' ? (
        <div className="flex items-center gap-2">
          <input
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            placeholder="https://example.com/icon.svg"
            className="flex-1 h-8 px-3 text-xs text-[#1A1917] bg-white border border-[#E3E1DC] rounded-[6px] focus:outline-none focus:border-[#C4853A] transition-colors placeholder:text-[#9C9890]"
          />
          <button
            onClick={() => void save(urlInput)}
            disabled={!urlInput.trim() || saving}
            className="h-8 px-3 text-xs font-medium text-[#1A1917] bg-[#C4853A] hover:bg-[#E8A855] rounded-[6px] transition-colors disabled:opacity-50"
          >
            Save
          </button>
          <button onClick={() => setEditing(false)} className="text-xs text-[#9C9890] hover:text-[#1A1917] transition-colors">Cancel</button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <label className="cursor-pointer h-8 px-3 inline-flex items-center text-xs font-medium text-[#1A1917] bg-white border border-[#E3E1DC] rounded-[6px] hover:bg-[#F5F4F0] transition-colors">
            {saving ? 'Uploading…' : 'Choose image'}
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={saving} />
          </label>
          <span className="text-[#9C9890] text-xs">Stored as data URL</span>
          <button onClick={() => setEditing(false)} className="ml-auto text-xs text-[#9C9890] hover:text-[#1A1917] transition-colors">Cancel</button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Admin Credentials Panel
// ---------------------------------------------------------------------------

function AdminCredentialsPanel({ connectorId, authType }: { connectorId: string; authType: string }) {
  const isOAuth2 = authType === 'oauth2'
  const [saving, setSaving]           = useState(false)
  const [showSecret, setShowSecret]   = useState(false)
  const [fields, setFields]           = useState<Record<string, string>>({})

  const fieldDefs = isOAuth2
    ? [
        { key: 'client_id',     label: 'Client ID',     secret: false, placeholder: 'OAuth client ID from the provider' },
        { key: 'client_secret', label: 'Client Secret', secret: true,  placeholder: 'OAuth client secret from the provider' },
      ]
    : []

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/connectors/${connectorId}/admin-credentials`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      if (res.ok) {
        toast.success('Credentials saved')
      } else {
        const data = await res.json() as { error?: { message?: string } }
        toast.error(data.error?.message ?? 'Failed to save')
      }
    } finally {
      setSaving(false)
    }
  }

  if (!isOAuth2) {
    return (
      <div className="bg-white border border-[#E3E1DC] rounded-[10px] p-5">
        <p className="text-[#1A1917] text-sm font-medium mb-1">Org-level credentials</p>
        <p className="text-[#6B6966] text-sm">
          These credentials are injected for all users of this connector. Configure them via the API:
        </p>
        <div className="mt-3 bg-[#0D0D0B] rounded-[8px] px-4 py-3">
          <code className="text-[#C4853A] font-mono text-xs">
            PUT /api/admin/connectors/{connectorId}/credentials
          </code>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-[#E3E1DC] rounded-[10px] p-5">
      <p className="text-[#1A1917] text-sm font-medium mb-1">OAuth client credentials</p>
      <p className="text-[#6B6966] text-sm mb-4">
        Register a Manifold OAuth app with the provider and paste the credentials here. These are used when users authorise access.
      </p>

      <div className="flex flex-col gap-3">
        {fieldDefs.map(f => (
          <div key={f.key}>
            <label className="block text-[#6B6966] text-xs font-medium uppercase tracking-[0.06em] mb-1.5">
              {f.label}
            </label>
            <div className="relative">
              <input
                type={f.secret && !showSecret ? 'password' : 'text'}
                value={fields[f.key] ?? ''}
                onChange={e => setFields(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full h-9 px-3 text-[13px] text-[#1A1917] bg-white border border-[#E3E1DC] rounded-[6px] focus:outline-none focus:border-[#C4853A] transition-colors placeholder:text-[#9C9890]"
              />
              {f.secret && (
                <button
                  type="button"
                  onClick={() => setShowSecret(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9C9890] hover:text-[#1A1917] transition-colors"
                >
                  {showSecret ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={save}
        disabled={saving || !fields['client_id']?.trim() || !fields['client_secret']?.trim()}
        className="mt-4 px-4 py-2 text-sm font-semibold text-[#1A1917] bg-[#C4853A] hover:bg-[#E8A855] rounded-[8px] transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
      >
        {saving ? <Loader2 size={13} className="animate-spin" /> : null}
        Save credentials
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ConnectorDetailClient({ connector, policy: initialPolicy, enabledCount }: ConnectorDetailProps) {
  const router = useRouter()

  const [tab, setTab]                   = useState<Tab>('overview')
  const [refreshing, setRefreshing]     = useState(false)
  const [savingPolicy, setSavingPolicy] = useState(false)
  const [required, setRequired]         = useState(initialPolicy?.required ?? false)
  const [logToolCalls, setLogToolCalls] = useState(initialPolicy?.logToolCalls ?? true)
  const [disabledTools, setDisabledTools] = useState<Set<string>>(
    new Set(initialPolicy?.disabledTools ?? [])
  )

  // Track initial tool state to know when there are unsaved changes
  const initialDisabled = useRef(new Set(initialPolicy?.disabledTools ?? []))

  const hasToolChanges = useMemo(() => {
    if (initialDisabled.current.size !== disabledTools.size) return true
    for (const t of disabledTools) {
      if (!initialDisabled.current.has(t)) return true
    }
    return false
  }, [disabledTools])

  const tools = connector.discoveredTools ?? []

  // Show credentials tab for admin-managed connectors (non-none auth) or oauth2 connectors
  // For oauth2, admin must configure client_id + client_secret regardless of managedBy
  const showCredentials =
    (connector.managedBy === 'admin' && connector.authType !== 'none') ||
    connector.authType === 'oauth2'

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview',    label: 'Overview' },
    { key: 'tools',       label: `Tools${tools.length > 0 ? ` (${tools.length})` : ''}` },
    { key: 'policy',      label: 'Policy' },
    ...(showCredentials ? [{ key: 'credentials' as Tab, label: 'Credentials' }] : []),
  ]

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const refreshTools = async () => {
    setRefreshing(true)
    try {
      const res = await fetch(`/api/admin/connectors/${connector.id}/refresh-tools`, { method: 'POST' })
      const data = await res.json() as { ok?: boolean; toolCount?: number; diff?: { added: string[]; removed: string[] }; error?: { message?: string } }
      if (!res.ok || !data.ok) {
        toast.error(data.error?.message ?? 'Refresh failed')
        return
      }
      const { added = [], removed = [] } = data.diff ?? {}
      if (added.length || removed.length) {
        toast.success(`Tools updated — +${added.length} / -${removed.length}`)
      } else {
        toast.success(`Tools refreshed — ${data.toolCount} found, no changes`)
      }
      router.refresh()
    } finally {
      setRefreshing(false)
    }
  }

  const deprecate = async () => {
    if (!confirm(`Deprecate ${connector.name}? Users will lose access to its tools.`)) return
    const res = await fetch(`/api/admin/connectors/${connector.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Connector deprecated')
      router.push('/admin/connectors')
    }
  }

  const savePolicy = async () => {
    setSavingPolicy(true)
    try {
      const res = await fetch(`/api/admin/connectors/${connector.id}/policy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ required, logToolCalls, disabledTools: Array.from(disabledTools) }),
      })
      if (res.ok) {
        toast.success('Policy saved')
        initialDisabled.current = new Set(disabledTools)
        router.refresh()
      } else {
        toast.error('Failed to save policy')
      }
    } finally {
      setSavingPolicy(false)
    }
  }

  const toggleTool = (toolName: string) => {
    setDisabledTools(prev => {
      const next = new Set(prev)
      if (next.has(toolName)) next.delete(toolName)
      else next.add(toolName)
      return next
    })
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div>
      {/* Tabs */}
      <AnimatedUnderlineTabs
        tabs={TABS}
        active={tab}
        onChange={setTab}
        className="mb-6"
      />

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div className="flex flex-col gap-5">
          {/* Alerts */}
          {connector.healthStatus === 'unreachable' && (
            <div className="bg-[#FDF2F2] border border-[#F5C6C6] rounded-[10px] px-4 py-3 text-sm text-[#A3352B]">
              <span className="font-medium">Connector unreachable.</span>{' '}
              The last health check failed. Verify the endpoint is running, then refresh tools.
            </div>
          )}
          {connector.toolsChangedAt && (
            <div className="bg-[#FBF3E8] border border-[#E8C88A] rounded-[10px] px-4 py-3 text-sm text-[#1A1917]">
              <span className="font-medium text-[#C4853A]">Tool list changed</span>{' '}
              on {new Date(connector.toolsChangedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.{' '}
              Review the{' '}
              <button onClick={() => setTab('tools')} className="text-[#C4853A] hover:underline">
                Tools tab
              </button>{' '}
              for breaking changes.
            </div>
          )}

          {/* Details table */}
          <div className="bg-white border border-[#E3E1DC] rounded-[10px] overflow-hidden">
            {/* Endpoint */}
            <div className="px-5 py-3.5 flex items-center justify-between gap-4 border-b border-[#E3E1DC]">
              <span className="text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em] flex-none">Endpoint</span>
              <div className="flex items-center gap-2 min-w-0">
                <code className="text-[#1A1917] font-mono text-xs text-right break-all">{connector.endpoint}</code>
                <CopyButton value={connector.endpoint} />
              </div>
            </div>

            {/* Auth type */}
            <div className="px-5 py-3.5 flex items-center justify-between gap-4 border-b border-[#E3E1DC]">
              <span className="text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em]">Auth type</span>
              <code className="text-[#1A1917] font-mono text-xs">{connector.authType}</code>
            </div>

            {/* Managed by */}
            <div className="px-5 py-3.5 flex items-center justify-between gap-4 border-b border-[#E3E1DC]">
              <span className="text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em]">Managed by</span>
              <span className="text-[#1A1917] text-sm capitalize">{connector.managedBy}</span>
            </div>

            {/* Status */}
            <div className="px-5 py-3.5 flex items-center justify-between gap-4 border-b border-[#E3E1DC]">
              <span className="text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em]">Status</span>
              <StatusBadge status={connector.status} />
            </div>

            {/* Health */}
            <div className="px-5 py-3.5 flex items-center justify-between gap-4 border-b border-[#E3E1DC]">
              <span className="text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em]">Health</span>
              <HealthBadge status={connector.healthStatus} lastCheck={connector.lastHealthCheck} />
            </div>

            {/* Users enabled */}
            <div className="px-5 py-3.5 flex items-center justify-between gap-4 border-b border-[#E3E1DC]">
              <span className="text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em]">Users enabled</span>
              <span className="text-[#1A1917] text-sm">{enabledCount}</span>
            </div>

            {/* Tools discovered */}
            <div className="px-5 py-3.5 flex items-center justify-between gap-4 border-b border-[#E3E1DC]">
              <span className="text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em]">Tools discovered</span>
              <span className="text-[#1A1917] text-sm">{tools.length}</span>
            </div>

            {/* Icon */}
            <div className="px-5 py-3.5 flex items-center justify-between gap-4">
              <span className="text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em] flex-none">Icon</span>
              <IconEditor
                connectorId={connector.id}
                currentIconUrl={connector.iconUrl}
                onSaved={() => router.refresh()}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={refreshTools}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-[#1A1917] bg-white border border-[#E3E1DC] rounded-[8px] hover:bg-[#F5F4F0] transition-colors disabled:opacity-50"
            >
              {refreshing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              Refresh tools
            </button>

            {connector.toolsDiscoveredAt && (
              <span className="text-[#9C9890] text-xs">
                last refreshed {timeAgo(new Date(connector.toolsDiscoveredAt))}
              </span>
            )}

            {connector.status !== 'deprecated' && (
              <button
                onClick={deprecate}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-[#A3352B] bg-white border border-[#E3E1DC] rounded-[8px] hover:bg-[#FDF2F2] transition-colors ml-auto"
              >
                <Trash2 size={13} />
                Deprecate
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Tools ── */}
      {tab === 'tools' && (
        <div className="flex flex-col gap-4">
          {tools.length === 0 ? (
            <div className="bg-white border border-[#E3E1DC] rounded-[10px] px-5 py-12 flex flex-col items-center gap-3">
              <p className="text-[#9C9890] text-sm">No tools discovered yet.</p>
              <button
                onClick={refreshTools}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 text-sm text-[#C4853A] hover:underline disabled:opacity-50"
              >
                {refreshing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                Run discovery
              </button>
            </div>
          ) : (
            <div className="bg-white border border-[#E3E1DC] rounded-[10px] overflow-hidden">
              {/* Header */}
              <div className="px-5 py-3 border-b border-[#E3E1DC] flex items-center justify-between gap-4">
                <p className="text-[#6B6966] text-xs">
                  {tools.length} tool{tools.length !== 1 ? 's' : ''}
                  {' · '}
                  {Array.from(disabledTools).filter(t => tools.some(tool => tool.name === t)).length} disabled
                </p>
                <button
                  onClick={savePolicy}
                  disabled={!hasToolChanges || savingPolicy}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-[6px] transition-all duration-150 ${
                    hasToolChanges
                      ? 'bg-[#C4853A] hover:bg-[#E8A855] text-[#1A1917] shadow-sm'
                      : 'bg-transparent text-[#9C9890] cursor-default'
                  }`}
                >
                  {savingPolicy ? 'Saving…' : hasToolChanges ? 'Save changes' : 'No changes'}
                </button>
              </div>

              {/* Tool list */}
              <div className="divide-y divide-[#E3E1DC]">
                {tools.map(tool => {
                  const isDisabled = disabledTools.has(tool.name)
                  return (
                    <div
                      key={tool.name}
                      className={`px-5 py-3.5 flex items-center justify-between gap-4 transition-colors ${
                        isDisabled ? 'bg-[#FAFAF9]' : 'hover:bg-[#F9F8F6]'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`font-mono text-xs font-medium transition-colors ${
                          isDisabled ? 'text-[#9C9890] line-through decoration-[#C4B8B0]' : 'text-[#1A1917]'
                        }`}>
                          {tool.name}
                        </p>
                        <p className={`text-xs mt-0.5 transition-colors ${isDisabled ? 'text-[#C4B8B0]' : 'text-[#6B6966]'}`}>
                          {tool.description}
                        </p>
                      </div>
                      <Toggle
                        checked={!isDisabled}
                        onChange={() => toggleTool(tool.name)}
                        label={isDisabled ? `Enable ${tool.name}` : `Disable ${tool.name}`}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Policy ── */}
      {tab === 'policy' && (
        <div className="flex flex-col gap-5">
          <div className="bg-white border border-[#E3E1DC] rounded-[10px] divide-y divide-[#E3E1DC]">
            <div className="px-5 py-4 flex items-start justify-between gap-6">
              <div>
                <p className="text-[#1A1917] text-sm font-medium">Required</p>
                <p className="text-[#6B6966] text-xs mt-0.5 max-w-xs">
                  Force-enable for all users. They cannot disable it.
                </p>
              </div>
              <Toggle checked={required} onChange={setRequired} label="Toggle required" />
            </div>

            <div className="px-5 py-4 flex items-start justify-between gap-6">
              <div>
                <p className="text-[#1A1917] text-sm font-medium">Log tool calls</p>
                <p className="text-[#6B6966] text-xs mt-0.5 max-w-xs">
                  Record each tool call in the audit log. Turn off for high-volume connectors.
                </p>
              </div>
              <Toggle checked={logToolCalls} onChange={setLogToolCalls} label="Toggle tool call logging" />
            </div>

            <div className="px-5 py-4 text-[#6B6966] text-xs">
              Tool-level controls are on the{' '}
              <button onClick={() => setTab('tools')} className="text-[#C4853A] hover:underline">
                Tools tab
              </button>.
            </div>
          </div>

          <button
            onClick={savePolicy}
            disabled={savingPolicy}
            className="self-start px-4 py-2 text-sm text-[#1A1917] bg-[#C4853A] hover:bg-[#E8A855] rounded-[8px] font-semibold transition-colors disabled:opacity-50"
          >
            {savingPolicy ? 'Saving…' : 'Save policy'}
          </button>
        </div>
      )}

      {/* ── Credentials (admin-managed or oauth2) ── */}
      {tab === 'credentials' && (
        <AdminCredentialsPanel connectorId={connector.id} authType={connector.authType} />
      )}
    </div>
  )
}
