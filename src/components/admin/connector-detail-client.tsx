'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Loader2, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { CopyButton } from '@/components/shared/copy-button'

type Tab = 'overview' | 'tools' | 'policy' | 'credentials'

interface ConnectorDetailProps {
  connector: {
    id:                string
    name:              string
    status:            string
    endpoint:          string
    authType:          string
    managedBy:         string
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

export function ConnectorDetailClient({ connector, policy: initialPolicy, enabledCount }: ConnectorDetailProps) {
  const router = useRouter()
  const [tab, setTab]           = useState<Tab>('overview')
  const [refreshing, setRefreshing] = useState(false)
  const [policy, setPolicy]     = useState(initialPolicy)
  const [savingPolicy, setSavingPolicy] = useState(false)
  const [required, setRequired] = useState(initialPolicy?.required ?? false)
  const [logToolCalls, setLogToolCalls] = useState(initialPolicy?.logToolCalls ?? true)
  const [disabledTools, setDisabledTools] = useState<Set<string>>(
    new Set(initialPolicy?.disabledTools ?? [])
  )

  const tools = connector.discoveredTools ?? []

  const refreshTools = async () => {
    setRefreshing(true)
    try {
      const res = await fetch(`/api/admin/connectors/${connector.id}/refresh-tools`, { method: 'POST' })
      const data = await res.json() as { ok?: boolean; toolCount?: number; error?: { message?: string } }
      if (!res.ok || !data.ok) {
        toast.error(data.error?.message ?? 'Refresh failed')
        return
      }
      toast.success(`Tools refreshed — ${data.toolCount} found`)
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

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview',     label: 'Overview' },
    { key: 'tools',        label: `Tools ${tools.length > 0 ? `(${tools.length})` : ''}` },
    { key: 'policy',       label: 'Policy' },
    ...(connector.managedBy === 'admin' ? [{ key: 'credentials' as Tab, label: 'Credentials' }] : []),
  ]

  return (
    <div>
      {/* Tabs */}
      <div className="flex border-b border-[#E3E1DC] mb-6">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'text-[#C4853A] border-[#C4853A]'
                : 'text-[#9C9890] border-transparent hover:text-[#1A1917]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="flex flex-col gap-5">
          {/* Health + drift alerts */}
          {connector.healthStatus === 'unreachable' && (
            <div className="bg-[#FDF2F2] border border-[#F5C6C6] rounded-[10px] px-4 py-3 text-sm text-[#A3352B]">
              <span className="font-medium">Connector unreachable.</span>{' '}
              The last health check failed. Check the endpoint is reachable, then refresh tools.
              {connector.lastHealthCheck && (
                <span className="text-[#A3352B]/70 text-xs ml-1">
                  (Last checked {new Date(connector.lastHealthCheck).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })})
                </span>
              )}
            </div>
          )}
          {connector.toolsChangedAt && (
            <div className="bg-[#FBF3E8] border border-[#E8C88A] rounded-[10px] px-4 py-3 text-sm text-[#1A1917]">
              <span className="font-medium text-[#C4853A]">Tool list changed</span>{' '}
              on {new Date(connector.toolsChangedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.
              {' '}Review the <button onClick={() => setTab('tools')} className="text-[#C4853A] hover:underline">Tools tab</button> to check for breaking changes.
            </div>
          )}

          <div className="bg-white border border-[#E3E1DC] rounded-[10px] divide-y divide-[#E3E1DC]">
            {[
              { label: 'Endpoint', value: connector.endpoint, mono: true, copy: true },
              { label: 'Auth type', value: connector.authType, mono: true },
              { label: 'Managed by', value: connector.managedBy },
              { label: 'Status', value: connector.status },
              { label: 'Health', value: connector.healthStatus ?? 'Not checked' },
              { label: 'Users enabled', value: String(enabledCount) },
              { label: 'Tools discovered', value: String(tools.length) },
              {
                label: 'Last refreshed',
                value: connector.toolsDiscoveredAt
                  ? new Date(connector.toolsDiscoveredAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : 'Never',
              },
            ].map(row => (
              <div key={row.label} className="px-5 py-3 flex items-center justify-between gap-4">
                <span className="text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em] flex-none">{row.label}</span>
                <div className="flex items-center gap-2">
                  {row.mono ? (
                    <code className="text-[#1A1917] font-mono text-xs text-right break-all">{row.value}</code>
                  ) : (
                    <span className="text-[#1A1917] text-sm">{row.value}</span>
                  )}
                  {row.copy && <CopyButton value={row.value} />}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={refreshTools}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-[#1A1917] bg-white border border-[#E3E1DC] rounded-[8px] hover:bg-[#F5F4F0] transition-colors disabled:opacity-50"
            >
              {refreshing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              Refresh tools
            </button>

            {connector.status !== 'deprecated' && (
              <button
                onClick={deprecate}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-[#A3352B] bg-white border border-[#E3E1DC] rounded-[8px] hover:bg-[#FDF2F2] transition-colors"
              >
                <Trash2 size={13} />Deprecate
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tools */}
      {tab === 'tools' && (
        <div className="flex flex-col gap-4">
          {tools.length === 0 ? (
            <div className="bg-white border border-[#E3E1DC] rounded-[10px] px-5 py-10 text-center">
              <p className="text-[#9C9890] text-sm">No tools discovered.</p>
              <button onClick={refreshTools} className="text-[#C4853A] text-sm mt-2 hover:underline">
                Run discovery
              </button>
            </div>
          ) : (
            <div className="bg-white border border-[#E3E1DC] rounded-[10px] overflow-hidden">
              <div className="px-5 py-3 border-b border-[#E3E1DC] flex items-center justify-between">
                <p className="text-[#6B6966] text-xs">{tools.length} tool{tools.length !== 1 ? 's' : ''} · Toggle to enable/disable for all users</p>
                <button
                  onClick={savePolicy}
                  disabled={savingPolicy}
                  className="text-xs text-[#C4853A] hover:underline disabled:opacity-50"
                >
                  {savingPolicy ? 'Saving…' : 'Save changes'}
                </button>
              </div>
              <div className="divide-y divide-[#E3E1DC]">
                {tools.map(tool => {
                  const isDisabled = disabledTools.has(tool.name)
                  return (
                    <div key={tool.name} className="px-5 py-3 flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className={`font-mono text-xs font-medium ${isDisabled ? 'text-[#9C9890] line-through' : 'text-[#1A1917]'}`}>
                          {tool.name}
                        </p>
                        <p className="text-[#6B6966] text-xs mt-0.5">{tool.description}</p>
                      </div>
                      <button
                        onClick={() => toggleTool(tool.name)}
                        className="flex-none mt-0.5"
                        aria-label={isDisabled ? 'Enable tool' : 'Disable tool'}
                      >
                        {isDisabled
                          ? <ToggleLeft size={20} className="text-[#9C9890]" />
                          : <ToggleRight size={20} className="text-[#C4853A]" />
                        }
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Policy */}
      {tab === 'policy' && (
        <div className="flex flex-col gap-5">
          <div className="bg-white border border-[#E3E1DC] rounded-[10px] p-5 flex flex-col gap-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[#1A1917] text-sm font-medium">Required</p>
                <p className="text-[#6B6966] text-xs mt-0.5">
                  Force-enable for all users. They cannot disable it.
                </p>
              </div>
              <button
                onClick={() => setRequired(r => !r)}
                className={`relative w-10 h-5 rounded-full transition-colors duration-150 flex-none mt-0.5 ${required ? 'bg-[#C4853A]' : 'bg-[#3A3836]'}`}
                aria-label="Toggle required"
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-150 ${required ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>

            <div className="border-t border-[#E3E1DC] pt-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[#1A1917] text-sm font-medium">Log tool calls</p>
                <p className="text-[#6B6966] text-xs mt-0.5">
                  Record each tool call in the audit log. Turn off for high-volume connectors.
                </p>
              </div>
              <button
                onClick={() => setLogToolCalls(v => !v)}
                className={`relative w-10 h-5 rounded-full transition-colors duration-150 flex-none mt-0.5 ${logToolCalls ? 'bg-[#C4853A]' : 'bg-[#3A3836]'}`}
                aria-label="Toggle tool call logging"
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-150 ${logToolCalls ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>

            <div className="border-t border-[#E3E1DC] pt-5 text-[#6B6966] text-xs">
              Tool-level controls are on the <button onClick={() => setTab('tools')} className="text-[#C4853A] hover:underline">Tools tab</button>.
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

      {/* Credentials (admin_managed only) */}
      {tab === 'credentials' && (
        <div className="bg-white border border-[#E3E1DC] rounded-[10px] p-5">
          <p className="text-[#6B6966] text-sm">
            Org-level credential management coming soon. For now, configure credentials via the API.
          </p>
        </div>
      )}
    </div>
  )
}
