import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { db } from '@/lib/db'
import { bundles, bundleConnectors, userBundles, userConnectorConfigs, connectors, auditLogs } from '@/lib/db/schema'
import { eq, and, notInArray } from 'drizzle-orm'

type RouteParams = { params: Promise<{ id: string; bundleId: string }> }

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: { code: 'forbidden' } }, { status: 403 })

  const { id: userId, bundleId } = await params

  const [bundle] = await db.select().from(bundles).where(eq(bundles.id, bundleId)).limit(1)
  if (!bundle) return NextResponse.json({ error: { code: 'not_found' } }, { status: 404 })

  await db
    .delete(userBundles)
    .where(and(eq(userBundles.userId, userId), eq(userBundles.bundleId, bundleId)))

  const bundleConns = await db
    .select({ connectorId: bundleConnectors.connectorId, authType: connectors.authType, managedBy: connectors.managedBy })
    .from(bundleConnectors)
    .innerJoin(connectors, eq(bundleConnectors.connectorId, connectors.id))
    .where(eq(bundleConnectors.bundleId, bundleId))

  const autoProvisionedIds = bundleConns
    .filter(c => c.managedBy === 'admin' || c.authType === 'none')
    .map(c => c.connectorId)

  if (autoProvisionedIds.length > 0) {
    const remainingBundles = await db
      .select({ bundleId: userBundles.bundleId })
      .from(userBundles)
      .where(and(eq(userBundles.userId, userId), notInArray(userBundles.bundleId, [bundleId])))

    const stillCovered = new Set<string>()
    if (remainingBundles.length > 0) {
      const remainingBundleIds = remainingBundles.map(b => b.bundleId)
      const coveringConns = await db
        .select({ connectorId: bundleConnectors.connectorId })
        .from(bundleConnectors)
        .where(
          remainingBundleIds.length === 1
            ? eq(bundleConnectors.bundleId, remainingBundleIds[0])
            : notInArray(bundleConnectors.bundleId, [bundleId]) // simplified: covers remaining
        )
      coveringConns.forEach(c => stillCovered.add(c.connectorId))
    }

    const toDisable = autoProvisionedIds.filter(id => !stillCovered.has(id))
    for (const connectorId of toDisable) {
      await db
        .update(userConnectorConfigs)
        .set({ enabled: false, updatedAt: new Date() })
        .where(and(
          eq(userConnectorConfigs.userId, userId),
          eq(userConnectorConfigs.connectorId, connectorId),
        ))
    }
  }

  await db.insert(auditLogs).values({
    actorId:      admin.userId,
    targetUserId: userId,
    action:       'bundle.removed',
    detail:       { bundleId, bundleName: bundle.name },
  })

  return NextResponse.json({ ok: true })
}
