import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { connectors, connectorPolicies, auditLogs } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { ManifestSchema, getManagedBy } from '@/lib/manifest'
import { connectAndDiscover } from '@/lib/mcp/discovery'
import { z } from 'zod'

const BodySchema = z.object({
  manifestUrl: z.string().url().optional(),
  manifest:    z.record(z.string(), z.unknown()).optional(),
}).refine(d => d.manifestUrl ?? d.manifest, {
  message: 'Provide either manifestUrl or manifest',
})

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: { code: 'forbidden' } }, { status: 403 })
  }

  const rows = await db.select().from(connectors).orderBy(connectors.createdAt)
  return NextResponse.json({ connectors: rows })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: { code: 'forbidden' } }, { status: 403 })
  }

  const rawBody = await req.json()
  const bodyParsed = BodySchema.safeParse(rawBody)
  if (!bodyParsed.success) {
    return NextResponse.json(
      { error: { code: 'validation_error', message: bodyParsed.error.message } },
      { status: 400 }
    )
  }

  // Fetch manifest from URL if provided
  let rawManifest: Record<string, unknown>
  if (bodyParsed.data.manifestUrl) {
    try {
      const res = await fetch(bodyParsed.data.manifestUrl, { signal: AbortSignal.timeout(10_000) })
      if (!res.ok) {
        return NextResponse.json(
          { error: { code: 'manifest_fetch_failed', message: `HTTP ${res.status} from manifest URL` } },
          { status: 400 }
        )
      }
      rawManifest = await res.json() as Record<string, unknown>
    } catch (err) {
      return NextResponse.json(
        { error: { code: 'manifest_fetch_failed', message: err instanceof Error ? err.message : 'Failed to fetch manifest' } },
        { status: 400 }
      )
    }
  } else {
    rawManifest = bodyParsed.data.manifest!
  }

  // Validate manifest schema
  const manifestParsed = ManifestSchema.safeParse(rawManifest)
  if (!manifestParsed.success) {
    return NextResponse.json(
      { error: { code: 'invalid_manifest', message: manifestParsed.error.message } },
      { status: 400 }
    )
  }

  const manifest = manifestParsed.data

  // Check ID uniqueness
  const [existing] = await db.select().from(connectors).where(eq(connectors.id, manifest.id)).limit(1)
  if (existing) {
    return NextResponse.json(
      { error: { code: 'id_conflict', message: `A connector with id "${manifest.id}" already exists` } },
      { status: 409 }
    )
  }

  // Discover tools from the endpoint
  let discoveredTools
  try {
    discoveredTools = await connectAndDiscover(manifest.endpoint)
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'discovery_failed', message: err instanceof Error ? err.message : 'Could not connect to connector endpoint' } },
      { status: 400 }
    )
  }

  if (discoveredTools.length === 0) {
    return NextResponse.json(
      { error: { code: 'no_tools', message: 'Connector endpoint returned no tools' } },
      { status: 400 }
    )
  }

  // Check for tool name collisions with existing connectors
  const existingRows = await db.select({ discoveredTools: connectors.discoveredTools })
    .from(connectors)
    .where(eq(connectors.status, 'active'))

  const existingToolNames = new Set<string>()
  for (const row of existingRows) {
    const tools = row.discoveredTools as Array<{ name: string }> | null
    if (Array.isArray(tools)) {
      for (const t of tools) existingToolNames.add(t.name)
    }
  }

  const conflicts = discoveredTools.filter(t => existingToolNames.has(t.name))
  if (conflicts.length > 0) {
    return NextResponse.json(
      {
        error: {
          code: 'tool_name_conflict',
          message: `Tool name conflict with existing connectors: ${conflicts.map(t => t.name).join(', ')}`,
        },
      },
      { status: 409 }
    )
  }

  // Insert connector
  await db.insert(connectors).values({
    id:                manifest.id,
    name:              manifest.name,
    description:       manifest.description,
    iconUrl:           manifest.icon,
    version:           manifest.version,
    status:            'active',
    endpoint:          manifest.endpoint,
    authType:          manifest.auth.type,
    managedBy:         getManagedBy(manifest),
    manifest:          manifest,
    discoveredTools:   discoveredTools,
    toolsDiscoveredAt: new Date(),
    submittedBy:       session.user.id,
    approvedBy:        session.user.id,
  })

  // Create default policy row
  await db.insert(connectorPolicies).values({ connectorId: manifest.id })

  // Audit log
  await db.insert(auditLogs).values({
    actorId:     session.user.id,
    connectorId: manifest.id,
    action:      'connector.registered',
    detail:      { name: manifest.name, toolCount: discoveredTools.length },
  })

  return NextResponse.json({
    ok: true,
    connector: { id: manifest.id, name: manifest.name, toolCount: discoveredTools.length },
  })
}
