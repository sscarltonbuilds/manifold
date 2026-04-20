import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { connectors, userConnectorConfigs } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { AddConnectorButton } from '@/components/admin/add-connector-button'
import { ConnectorsTableClient } from '@/components/admin/connectors-table-client'

export default async function AdminConnectorsPage() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') redirect('/connectors')

  const allConnectors = await db.select().from(connectors).orderBy(connectors.createdAt)
  const ago7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const enabledCounts = await db
    .select({
      connectorId: userConnectorConfigs.connectorId,
      count: sql<number>`count(*)::int`,
    })
    .from(userConnectorConfigs)
    .where(eq(userConnectorConfigs.enabled, true))
    .groupBy(userConnectorConfigs.connectorId)

  const countMap = new Map(enabledCounts.map(r => [r.connectorId, r.count]))

  const tableRows = allConnectors.map(c => ({
    id:             c.id,
    name:           c.name,
    description:    c.description,
    status:         c.status,
    authType:       c.authType,
    version:        c.version,
    iconUrl:        c.iconUrl,
    healthStatus:   c.healthStatus,
    toolsChangedAt: c.toolsChangedAt ? c.toolsChangedAt.toISOString() : null,
    toolCount:      Array.isArray(c.discoveredTools) ? (c.discoveredTools as unknown[]).length : 0,
    enabledCount:   countMap.get(c.id) ?? 0,
  }))

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[#1A1917] text-2xl font-medium tracking-tight">Connectors</h1>
          <p className="text-[#6B6966] text-sm mt-1">
            {allConnectors.filter(c => c.status === 'active').length} active connector{allConnectors.filter(c => c.status === 'active').length !== 1 ? 's' : ''}
          </p>
        </div>
        <AddConnectorButton />
      </div>

      {allConnectors.length === 0 ? (
        <div className="bg-white border border-[#E3E1DC] rounded-[10px] overflow-hidden">
          {/* Main empty state */}
          <div className="px-8 py-10 flex flex-col items-center text-center border-b border-[#E3E1DC]">
            <div className="w-10 h-10 bg-[#F5F4F0] border border-[#E3E1DC] rounded-[10px] flex items-center justify-center mb-4">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="4" r="2" fill="#C4853A" />
                <line x1="9" y1="6" x2="9" y2="10" stroke="#9C9890" strokeWidth="1.5" />
                <line x1="9" y1="10" x2="4" y2="14" stroke="#9C9890" strokeWidth="1.5" />
                <line x1="9" y1="10" x2="9" y2="14" stroke="#9C9890" strokeWidth="1.5" />
                <line x1="9" y1="10" x2="14" y2="14" stroke="#9C9890" strokeWidth="1.5" />
                <circle cx="4" cy="15" r="1.5" fill="#9C9890" />
                <circle cx="9" cy="15" r="1.5" fill="#9C9890" />
                <circle cx="14" cy="15" r="1.5" fill="#9C9890" />
              </svg>
            </div>
            <p className="text-[#1A1917] text-sm font-medium">No connectors registered.</p>
            <p className="text-[#9C9890] text-sm mt-1 max-w-xs">
              Connectors are external MCP servers described by a <code className="font-mono text-xs text-[#1A1917]">manifold.json</code> manifest.
            </p>
          </div>

          {/* Three paths */}
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#E3E1DC]">
            {/* Path 1: UI */}
            <div className="px-6 py-5 flex flex-col gap-2">
              <p className="text-[#1A1917] text-xs font-semibold uppercase tracking-[0.08em]">From the UI</p>
              <p className="text-[#6B6966] text-xs leading-relaxed">
                Paste a manifest URL or JSON into the Add connector form above. Manifold validates it and discovers tools automatically.
              </p>
            </div>

            {/* Path 2: CLI */}
            <div className="px-6 py-5 flex flex-col gap-2">
              <p className="text-[#1A1917] text-xs font-semibold uppercase tracking-[0.08em]">Via the CLI</p>
              <p className="text-[#6B6966] text-xs leading-relaxed mb-1">
                From the connector&apos;s directory:
              </p>
              <div className="bg-[#0D0D0B] rounded-[6px] px-3 py-2.5 flex flex-col gap-1">
                <code className="text-[#C4853A] font-mono text-[10px]">manifold validate</code>
                <code className="text-[#C4853A] font-mono text-[10px]">manifold publish \</code>
                <code className="text-[#9C9890] font-mono text-[10px] pl-3">--registry https://your-domain.com \</code>
                <code className="text-[#9C9890] font-mono text-[10px] pl-3">--token &lt;admin-token&gt;</code>
              </div>
            </div>

            {/* Path 3: API */}
            <div className="px-6 py-5 flex flex-col gap-2">
              <p className="text-[#1A1917] text-xs font-semibold uppercase tracking-[0.08em]">Via the API</p>
              <p className="text-[#6B6966] text-xs leading-relaxed mb-1">
                POST a manifest URL to the registry endpoint:
              </p>
              <div className="bg-[#0D0D0B] rounded-[6px] px-3 py-2.5">
                <code className="text-[#C4853A] font-mono text-[10px] break-all">
                  POST /api/admin/connectors<br />
                  <span className="text-[#9C9890]">{'{'} &quot;manifestUrl&quot;: &quot;...&quot; {'}'}</span>
                </code>
              </div>
            </div>
          </div>

          {/* Docs link */}
          <div className="px-6 py-4 border-t border-[#E3E1DC] bg-[#FAFAF9]">
            <a
              href="https://github.com/your-org/manifold/blob/main/docs/connectors.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#C4853A] hover:underline"
            >
              Read the connector documentation →
            </a>
          </div>
        </div>
      ) : (
        <ConnectorsTableClient rows={tableRows} ago7d={ago7d} />
      )}
    </div>
  )
}
