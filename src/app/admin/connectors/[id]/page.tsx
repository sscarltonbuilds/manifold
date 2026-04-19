import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { connectors, connectorPolicies, userConnectorConfigs } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { ConnectorDetailClient } from '@/components/admin/connector-detail-client'

export default async function AdminConnectorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') redirect('/connectors')

  const { id } = await params
  const [connector] = await db.select().from(connectors).where(eq(connectors.id, id)).limit(1)
  if (!connector) notFound()

  const [policy] = await db.select().from(connectorPolicies).where(eq(connectorPolicies.connectorId, id)).limit(1)
  const [{ count: enabledCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(userConnectorConfigs)
    .where(eq(userConnectorConfigs.connectorId, id))

  return (
    <div className="p-8 max-w-4xl">
      <Link
        href="/admin/connectors"
        className="inline-flex items-center gap-1 text-[#6B6966] hover:text-[#1A1917] text-sm mb-6 transition-colors"
      >
        <ChevronLeft size={14} />Connectors
      </Link>

      <div className="flex items-start gap-4 mb-8">
        {connector.iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={connector.iconUrl} alt="" className="w-10 h-10 object-contain flex-none mt-1" />
        ) : (
          <div className="w-10 h-10 bg-[#1A1917] rounded-[8px] flex-none mt-1" />
        )}
        <div>
          <h1 className="text-[#1A1917] text-2xl font-medium tracking-tight">{connector.name}</h1>
          <p className="text-[#6B6966] text-sm mt-0.5">{connector.description}</p>
        </div>
      </div>

      <ConnectorDetailClient
        connector={{
          id:                connector.id,
          name:              connector.name,
          status:            connector.status,
          endpoint:          connector.endpoint,
          authType:          connector.authType,
          managedBy:         connector.managedBy,
          manifest:          connector.manifest,
          discoveredTools:   connector.discoveredTools as Array<{ name: string; description: string }> | null,
          toolsDiscoveredAt: connector.toolsDiscoveredAt?.toISOString() ?? null,
          toolsChangedAt:    connector.toolsChangedAt?.toISOString() ?? null,
          healthStatus:      connector.healthStatus,
          lastHealthCheck:   connector.lastHealthCheck?.toISOString() ?? null,
          createdAt:         connector.createdAt.toISOString(),
        }}
        policy={policy ? {
          required:         policy.required,
          logToolCalls:     policy.logToolCalls,
          disabledTools:    policy.disabledTools as string[],
          rateLimitPerHour: policy.rateLimitPerHour as Record<string, number> | null,
        } : null}
        enabledCount={enabledCount}
      />
    </div>
  )
}
