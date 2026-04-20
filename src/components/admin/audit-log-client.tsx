'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { AnimatedTabs } from '@/components/ui/animated-tabs'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuditRow {
  id: string
  action: string
  detail: unknown
  createdAt: Date
  connectorId: string | null
  actorName: string
  actorEmail: string
}

// ---------------------------------------------------------------------------
// Label + category map
// ---------------------------------------------------------------------------

const ACTION_META: Record<string, { label: string; category: Category; colour: string }> = {
  'connector.registered':          { label: 'Connector registered',    category: 'connectors', colour: '#4A7C59' },
  'connector.deprecated':          { label: 'Connector deprecated',    category: 'connectors', colour: '#9C9890' },
  'connector.tools_refreshed':     { label: 'Tools refreshed',         category: 'connectors', colour: '#6B6966' },
  'connector.tools_added':         { label: 'Tools added',             category: 'connectors', colour: '#C4853A' },
  'connector.tools_removed':       { label: 'Tools removed',           category: 'connectors', colour: '#A3352B' },
  'connector.health_check_failed': { label: 'Health check failed',     category: 'connectors', colour: '#A3352B' },
  'connector.policy_updated':      { label: 'Policy updated',          category: 'connectors', colour: '#6B6966' },
  'connector.enabled':             { label: 'Connector enabled',       category: 'connectors', colour: '#4A7C59' },
  'connector.disabled':            { label: 'Connector disabled',      category: 'connectors', colour: '#9C9890' },
  'tool.called':                   { label: 'Tool called',             category: 'tools',      colour: '#6B6966' },
  'user.role_changed':             { label: 'Role changed',            category: 'users',      colour: '#C4853A' },
  'config.updated':                { label: 'Config updated',          category: 'users',      colour: '#6B6966' },
  'config.removed':                { label: 'Config removed',          category: 'users',      colour: '#9C9890' },
  'oauth.token_issued':            { label: 'Token issued',            category: 'auth',       colour: '#4A7C59' },
  'oauth.token_revoked':           { label: 'Token revoked',           category: 'auth',       colour: '#A3352B' },
}

type Category = 'all' | 'connectors' | 'tools' | 'users' | 'auth'

const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'all',        label: 'All' },
  { key: 'connectors', label: 'Connectors' },
  { key: 'tools',      label: 'Tools' },
  { key: 'users',      label: 'Users' },
  { key: 'auth',       label: 'Auth' },
]

type Window = 'all' | 'today' | '7d' | '30d'
const WINDOWS: { key: Window; label: string }[] = [
  { key: 'all',   label: 'All time' },
  { key: 'today', label: 'Today' },
  { key: '7d',    label: 'Last 7 days' },
  { key: '30d',   label: 'Last 30 days' },
]

// ---------------------------------------------------------------------------
// Detail renderer
// ---------------------------------------------------------------------------

function renderDetail(action: string, detail: unknown): React.ReactNode {
  if (!detail || typeof detail !== 'object') return <span className="text-[#9C9890]">—</span>
  const d = detail as Record<string, unknown>

  if (action === 'tool.called') {
    const name = typeof d.toolName === 'string' ? d.toolName : null
    const ms   = typeof d.durationMs === 'number' ? d.durationMs : null
    const ok   = d.success !== false
    return (
      <div className="flex items-center gap-2">
        {name && <code className="text-[#1A1917] font-mono text-xs bg-[#F5F4F0] px-1.5 py-0.5 rounded">{name}</code>}
        {ms !== null && <span className="text-[#9C9890] text-xs">{ms}ms</span>}
        <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${ok ? 'text-[#4A7C59] bg-[#EBF5EF]' : 'text-[#A3352B] bg-[#FDF2F2]'}`}>
          {ok ? 'OK' : 'Error'}
        </span>
      </div>
    )
  }

  if ((action === 'connector.tools_added' || action === 'connector.tools_removed') && Array.isArray(d.tools)) {
    const tools = d.tools as string[]
    const prefix = action === 'connector.tools_added' ? '+' : '−'
    return (
      <span className="text-xs text-[#6B6966]">
        <span className={action === 'connector.tools_added' ? 'text-[#4A7C59]' : 'text-[#A3352B]'}>
          {prefix}{tools.length}
        </span>
        {' '}
        {tools.slice(0, 3).join(', ')}{tools.length > 3 ? ` +${tools.length - 3} more` : ''}
      </span>
    )
  }

  if (action === 'connector.tools_refreshed') {
    return (
      <span className="text-xs text-[#6B6966]">
        {typeof d.toolCount === 'number' ? `${d.toolCount} tools` : ''}
        {typeof d.added === 'number' && typeof d.removed === 'number'
          ? ` · +${d.added} / -${d.removed}`
          : ''}
      </span>
    )
  }

  if (action === 'connector.health_check_failed' && typeof d.error === 'string') {
    return <span className="text-xs text-[#A3352B] truncate max-w-[260px] block">{d.error}</span>
  }

  if (action === 'user.role_changed') {
    return (
      <span className="text-xs text-[#6B6966]">
        {typeof d.from === 'string' && typeof d.to === 'string'
          ? `${d.from} → ${d.to}`
          : JSON.stringify(d)}
      </span>
    )
  }

  // Fallback — show keys that are meaningful
  const summary = Object.entries(d)
    .filter(([k]) => !['connectorId'].includes(k))
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(' · ')

  return summary
    ? <span className="text-xs text-[#9C9890]">{summary}</span>
    : <span className="text-[#9C9890]">—</span>
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AuditLogClient({ rows }: { rows: AuditRow[] }) {
  const [category, setCategory] = useState<Category>('all')
  const [window_,  setWindow]   = useState<Window>('all')
  const [search,   setSearch]   = useState('')

  const filtered = useMemo(() => {
    const now = Date.now()
    const windowMs: Record<Window, number> = {
      all:   Infinity,
      today: 24 * 60 * 60 * 1000,
      '7d':  7  * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    }
    const cutoff = window_ === 'all' ? 0 : now - windowMs[window_]

    return rows.filter(row => {
      if (new Date(row.createdAt).getTime() < cutoff) return false
      if (category !== 'all') {
        const cat = ACTION_META[row.action]?.category ?? 'connectors'
        if (cat !== category) return false
      }
      if (search) {
        const q = search.toLowerCase()
        if (
          !row.actorName.toLowerCase().includes(q) &&
          !row.actorEmail.toLowerCase().includes(q) &&
          !(ACTION_META[row.action]?.label ?? row.action).toLowerCase().includes(q)
        ) return false
      }
      return true
    })
  }, [rows, category, window_, search])

  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Category tabs */}
        <AnimatedTabs
          tabs={CATEGORIES}
          active={category}
          onChange={setCategory}
        />

        {/* Time window */}
        <select
          value={window_}
          onChange={e => setWindow(e.target.value as Window)}
          className="h-8 pl-3 pr-8 text-xs text-[#1A1917] bg-white border border-[#E3E1DC] rounded-[8px] appearance-none focus:outline-none focus:border-[#C4853A] transition-colors cursor-pointer"
        >
          {WINDOWS.map(w => (
            <option key={w.key} value={w.key}>{w.label}</option>
          ))}
        </select>

        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9C9890] pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by actor or action…"
            className="w-full h-8 pl-8 pr-3 text-xs text-[#1A1917] bg-white border border-[#E3E1DC] rounded-[8px] focus:outline-none focus:border-[#C4853A] transition-colors placeholder:text-[#9C9890]"
          />
        </div>

        <span className="text-[#9C9890] text-xs ml-auto">
          {filtered.length} event{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-[#E3E1DC] rounded-[10px] py-12 text-center text-[#9C9890] text-sm">
          No events match the current filters.
        </div>
      ) : (
        <div className="bg-white border border-[#E3E1DC] rounded-[10px] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E3E1DC] bg-[#FAFAF9]">
                <th className="text-left px-5 py-3 text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em] w-32">Time</th>
                <th className="text-left px-5 py-3 text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em] w-44">Actor</th>
                <th className="text-left px-5 py-3 text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em] w-44">Action</th>
                <th className="text-left px-5 py-3 text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em]">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E1DC]">
              {filtered.map(row => {
                const meta = ACTION_META[row.action]
                return (
                  <tr key={row.id} className="hover:bg-[#F9F8F6] transition-colors">
                    <td className="px-5 py-3 text-[#9C9890] text-xs whitespace-nowrap tabular-nums">
                      {new Date(row.createdAt).toLocaleString('en-GB', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-[#1A1917] text-sm leading-tight">{row.actorName}</p>
                      <p className="text-[#9C9890] text-xs mt-0.5">{row.actorEmail}</p>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-none"
                          style={{ backgroundColor: meta?.colour ?? '#9C9890' }}
                        />
                        <span className="text-[#1A1917] text-sm">
                          {meta?.label ?? row.action}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {renderDetail(row.action, row.detail)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
