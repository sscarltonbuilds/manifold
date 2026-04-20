import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { db } from '@/lib/db'
import { connectors, auditLogs } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { connectAndDiscover } from '@/lib/mcp/discovery'

type RouteParams = { params: Promise<{ id: string }> }

interface StoredTool { name: string; description?: string }

function diffTools(
  oldTools: StoredTool[],
  newTools: StoredTool[],
): { added: string[]; removed: string[] } {
  const oldNames = new Set(oldTools.map(t => t.name))
  const newNames = new Set(newTools.map(t => t.name))
  return {
    added:   newTools.filter(t => !oldNames.has(t.name)).map(t => t.name),
    removed: oldTools.filter(t => !newNames.has(t.name)).map(t => t.name),
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: { code: 'forbidden' } }, { status: 403 })

  const { id } = await params
  const [connector] = await db.select().from(connectors).where(eq(connectors.id, id)).limit(1)
  if (!connector) return NextResponse.json({ error: { code: 'not_found' } }, { status: 404 })

  const oldTools = Array.isArray(connector.discoveredTools)
    ? (connector.discoveredTools as StoredTool[])
    : []

  const now = new Date()

  // Attempt discovery
  let newTools: StoredTool[]
  try {
    newTools = await connectAndDiscover(connector.endpoint)
  } catch (err) {
    // Discovery failed — mark unhealthy, log, return error
    await db.update(connectors)
      .set({ healthStatus: 'unreachable', lastHealthCheck: now, updatedAt: now })
      .where(eq(connectors.id, id))

    await db.insert(auditLogs).values({
      actorId:     admin.userId,
      connectorId: id,
      action:      'connector.health_check_failed',
      detail:      { error: err instanceof Error ? err.message : 'Discovery failed' },
    })

    return NextResponse.json(
      { error: { code: 'discovery_failed', message: err instanceof Error ? err.message : 'Discovery failed' } },
      { status: 400 },
    )
  }

  // Diff old vs new
  const { added, removed } = diffTools(oldTools, newTools)
  const toolsChanged = added.length > 0 || removed.length > 0

  // Build update
  await db.update(connectors)
    .set({
      discoveredTools:  newTools,
      toolsDiscoveredAt: now,
      healthStatus:     'healthy',
      lastHealthCheck:  now,
      ...(toolsChanged ? { toolsChangedAt: now } : {}),
      updatedAt:        now,
    })
    .where(eq(connectors.id, id))

  // Always log the refresh
  await db.insert(auditLogs).values({
    actorId:     admin.userId,
    connectorId: id,
    action:      'connector.tools_refreshed',
    detail:      { toolCount: newTools.length, added: added.length, removed: removed.length },
  })

  // Log drift events separately so they surface in the overview
  if (added.length > 0) {
    await db.insert(auditLogs).values({
      actorId:     admin.userId,
      connectorId: id,
      action:      'connector.tools_added',
      detail:      { tools: added },
    })
  }
  if (removed.length > 0) {
    await db.insert(auditLogs).values({
      actorId:     admin.userId,
      connectorId: id,
      action:      'connector.tools_removed',
      detail:      { tools: removed },
    })
  }

  return NextResponse.json({
    ok: true,
    toolCount: newTools.length,
    diff: { added, removed },
  })
}
