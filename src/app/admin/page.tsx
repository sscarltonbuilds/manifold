import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { connectors, auditLogs, users, userConnectorConfigs } from '@/lib/db/schema'
import { eq, desc, gte, and, ne, sql } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import type { McpTool } from '@/lib/mcp/types'

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const ACTION_LABELS: Record<string, { label: string; colour: string }> = {
  'connector.registered':          { label: 'Connector registered',     colour: '#4A7C59' },
  'connector.tools_refreshed':     { label: 'Tools refreshed',          colour: '#6B6966' },
  'connector.tools_added':         { label: 'Tools added',              colour: '#C4853A' },
  'connector.tools_removed':       { label: 'Tools removed',            colour: '#A3352B' },
  'connector.health_check_failed': { label: 'Health check failed',      colour: '#A3352B' },
  'connector.deprecated':          { label: 'Connector deprecated',     colour: '#9C9890' },
  'user.role_changed':             { label: 'Role changed',             colour: '#6B6966' },
  'config.updated':                { label: 'Config updated',           colour: '#6B6966' },
  'config.removed':                { label: 'Config removed',           colour: '#6B6966' },
  'oauth.token_issued':            { label: 'OAuth token issued',       colour: '#6B6966' },
  'oauth.token_revoked':           { label: 'OAuth token revoked',      colour: '#A3352B' },
}

function subtitleForEvent(action: string, detail: unknown): string | null {
  if (!detail || typeof detail !== 'object') return null
  const d = detail as Record<string, unknown>
  if (action === 'connector.tools_added' && Array.isArray(d.tools)) {
    return `+${(d.tools as string[]).length} tool${(d.tools as string[]).length !== 1 ? 's' : ''}: ${(d.tools as string[]).slice(0, 3).join(', ')}${(d.tools as string[]).length > 3 ? '…' : ''}`
  }
  if (action === 'connector.tools_removed' && Array.isArray(d.tools)) {
    return `-${(d.tools as string[]).length} tool${(d.tools as string[]).length !== 1 ? 's' : ''}: ${(d.tools as string[]).slice(0, 3).join(', ')}${(d.tools as string[]).length > 3 ? '…' : ''}`
  }
  if (action === 'connector.tools_refreshed' && typeof d.toolCount === 'number') {
    return `${d.toolCount} tool${d.toolCount !== 1 ? 's' : ''}, ${d.added} added, ${d.removed} removed`
  }
  if (action === 'connector.health_check_failed' && typeof d.error === 'string') {
    return d.error.slice(0, 60)
  }
  if (action === 'connector.registered' && typeof d.toolCount === 'number') {
    return `${d.toolCount} tool${d.toolCount !== 1 ? 's' : ''} discovered`
  }
  return null
}

export default async function AdminOverviewPage() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') redirect('/connectors')

  const now = new Date()
  const ago24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const ago7d  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000)

  const [
    allConnectors,
    toolCallCount,
    activeUserCount,
    recentEvents,
    connectorNames,
  ] = await Promise.all([
    db.select().from(connectors).orderBy(connectors.name),

    // Tool calls in last 24h
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(and(eq(auditLogs.action, 'tool.called'), gte(auditLogs.createdAt, ago24h)))
      .then(r => r[0]?.count ?? 0),

    // Distinct users who made tool calls in last 7d
    db
      .select({ count: sql<number>`count(distinct ${auditLogs.actorId})::int` })
      .from(auditLogs)
      .where(and(eq(auditLogs.action, 'tool.called'), gte(auditLogs.createdAt, ago7d)))
      .then(r => r[0]?.count ?? 0),

    // Recent non-tool-call events
    db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        detail: auditLogs.detail,
        createdAt: auditLogs.createdAt,
        connectorId: auditLogs.connectorId,
        actorName: users.name,
      })
      .from(auditLogs)
      .innerJoin(users, eq(auditLogs.actorId, users.id))
      .where(ne(auditLogs.action, 'tool.called'))
      .orderBy(desc(auditLogs.createdAt))
      .limit(8),

    // Connector names for lookup
    db.select({ id: connectors.id, name: connectors.name }).from(connectors),
  ])

  const connectorNameMap = new Map(connectorNames.map(c => [c.id, c.name]))
  const activeConnectors    = allConnectors.filter(c => c.status === 'active')
  const unhealthyConnectors = activeConnectors.filter(c => c.healthStatus === 'unreachable')
  const driftConnectors     = activeConnectors.filter(
    c => c.toolsChangedAt && c.toolsChangedAt >= ago7d,
  )

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-[#1A1917] text-2xl font-medium tracking-tight">Overview</h1>
        <p className="text-[#6B6966] text-sm mt-1">Platform health at a glance.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {/* Active connectors */}
        <div className="bg-white border border-[#E3E1DC] rounded-[10px] px-5 py-4">
          <p className="text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em] mb-2">Active connectors</p>
          <p className="text-[#1A1917] text-3xl font-light">{activeConnectors.length}</p>
          {unhealthyConnectors.length > 0 ? (
            <p className="text-[#A3352B] text-xs mt-1">
              {unhealthyConnectors.length} unreachable
            </p>
          ) : activeConnectors.length > 0 ? (
            <p className="text-[#4A7C59] text-xs mt-1">All healthy</p>
          ) : (
            <p className="text-[#9C9890] text-xs mt-1">None registered</p>
          )}
        </div>

        {/* Tool calls 24h */}
        <div className="bg-white border border-[#E3E1DC] rounded-[10px] px-5 py-4">
          <p className="text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em] mb-2">Tool calls (24h)</p>
          <p className="text-[#1A1917] text-3xl font-light">{toolCallCount.toLocaleString()}</p>
          <p className="text-[#9C9890] text-xs mt-1">Across all connectors</p>
        </div>

        {/* Active users 7d */}
        <div className="bg-white border border-[#E3E1DC] rounded-[10px] px-5 py-4">
          <p className="text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em] mb-2">Active users (7d)</p>
          <p className="text-[#1A1917] text-3xl font-light">{activeUserCount}</p>
          <p className="text-[#9C9890] text-xs mt-1">Made at least one tool call</p>
        </div>
      </div>

      {/* Drift alert */}
      {driftConnectors.length > 0 && (
        <div className="bg-[#FBF3E8] border border-[#E8C88A] rounded-[10px] px-5 py-4 mb-6 flex items-start gap-3">
          <AlertTriangle size={16} className="text-[#C4853A] mt-0.5 flex-none" strokeWidth={1.75} />
          <div>
            <p className="text-[#1A1917] text-sm font-medium">
              Tool list changed in the last 7 days
            </p>
            <p className="text-[#6B6966] text-xs mt-1">
              {driftConnectors.map(c => c.name).join(', ')} — review the Tools tab to check for breaking changes.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Connector health */}
        <div>
          <h2 className="text-[#1A1917] text-sm font-semibold mb-3">Connector health</h2>
          {activeConnectors.length === 0 ? (
            <div className="bg-white border border-[#E3E1DC] rounded-[10px] py-8 text-center text-[#9C9890] text-sm">
              No active connectors.{' '}
              <Link href="/admin/connectors" className="text-[#C4853A] hover:underline">
                Add one →
              </Link>
            </div>
          ) : (
            <div className="bg-white border border-[#E3E1DC] rounded-[10px] overflow-hidden divide-y divide-[#E3E1DC]">
              {activeConnectors.map(c => {
                const toolCount = Array.isArray(c.discoveredTools)
                  ? (c.discoveredTools as McpTool[]).length
                  : 0
                const isUnhealthy = c.healthStatus === 'unreachable'
                const hasDrift = c.toolsChangedAt && c.toolsChangedAt >= ago7d

                return (
                  <Link
                    key={c.id}
                    href={`/admin/connectors/${c.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-[#F5F4F0] transition-colors"
                  >
                    {/* Health dot */}
                    <span
                      className="w-2 h-2 rounded-full flex-none"
                      style={{
                        backgroundColor: isUnhealthy
                          ? '#A3352B'
                          : c.healthStatus === 'healthy'
                          ? '#4A7C59'
                          : '#9C9890',
                      }}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[#1A1917] text-sm font-medium truncate">{c.name}</span>
                        {hasDrift && (
                          <span className="text-[#C4853A] bg-[#FBF3E8] text-[10px] font-semibold uppercase tracking-[0.06em] px-1.5 py-0.5 rounded-full flex-none">
                            Tools changed
                          </span>
                        )}
                      </div>
                      <p className="text-[#9C9890] text-xs">
                        {toolCount} tool{toolCount !== 1 ? 's' : ''}
                        {c.lastHealthCheck
                          ? ` · checked ${timeAgo(new Date(c.lastHealthCheck))}`
                          : ' · not yet checked'}
                      </p>
                    </div>

                    <span className="text-[#E3E1DC] text-xs">→</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent events */}
        <div>
          <h2 className="text-[#1A1917] text-sm font-semibold mb-3">Recent events</h2>
          {recentEvents.length === 0 ? (
            <div className="bg-white border border-[#E3E1DC] rounded-[10px] py-8 text-center text-[#9C9890] text-sm">
              No events recorded yet.
            </div>
          ) : (
            <div className="bg-white border border-[#E3E1DC] rounded-[10px] overflow-hidden divide-y divide-[#E3E1DC]">
              {recentEvents.map(event => {
                const meta = ACTION_LABELS[event.action]
                const subtitle = subtitleForEvent(event.action, event.detail)
                return (
                  <div key={event.id} className="px-4 py-3 flex items-start gap-3">
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-none mt-1.5"
                      style={{ backgroundColor: meta?.colour ?? '#9C9890' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[#1A1917] text-xs font-medium">
                        {meta?.label ?? event.action}
                        {event.connectorId && (
                          <span className="text-[#6B6966] font-normal">
                            {' '}· {connectorNameMap.get(event.connectorId) ?? event.connectorId}
                          </span>
                        )}
                      </p>
                      {subtitle && (
                        <p className="text-[#9C9890] text-xs truncate">{subtitle}</p>
                      )}
                      <p className="text-[#9C9890] text-[10px] mt-0.5">
                        {event.actorName} · {timeAgo(new Date(event.createdAt))}
                      </p>
                    </div>
                  </div>
                )
              })}

              <div className="px-4 py-2.5">
                <Link href="/admin/audit" className="text-xs text-[#C4853A] hover:underline">
                  View full audit log →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
