import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { db } from '@/lib/db'
import { connectors, auditLogs } from '@/lib/db/schema'
import { eq, ne, and } from 'drizzle-orm'
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

  // Check for tool name collisions with OTHER active connectors
  const otherConnectors = await db
    .select({ id: connectors.id, name: connectors.name, discoveredTools: connectors.discoveredTools })
    .from(connectors)
    .where(and(eq(connectors.status, 'active'), ne(connectors.id, id)))

  const newToolNames = new Set(newTools.map(t => t.name))
  const collisions: { tool: string; conflictsWith: string }[] = []

  for (const other of otherConnectors) {
    if (!Array.isArray(other.discoveredTools)) continue
    for (const tool of other.discoveredTools as StoredTool[]) {
      if (newToolNames.has(tool.name)) {
        collisions.push({ tool: tool.name, conflictsWith: other.name })
      }
    }
  }

  if (collisions.length > 0) {
    return NextResponse.json(
      {
        error: {
          code: 'tool_name_conflict',
          message: `Tool name collision detected. These tools already exist in other active connectors: ${
            collisions.map(c => `"${c.tool}" (in ${c.conflictsWith})`).join(', ')
          }`,
          collisions,
        },
      },
      { status: 409 },
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
