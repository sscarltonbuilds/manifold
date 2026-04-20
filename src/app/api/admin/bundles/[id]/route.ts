import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { bundles, bundleConnectors, userBundles, connectors, auditLogs } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: { code: 'forbidden' } }, { status: 403 })
  }

  const { id } = await params

  const [bundle] = await db.select().from(bundles).where(eq(bundles.id, id)).limit(1)
  if (!bundle) return NextResponse.json({ error: { code: 'not_found' } }, { status: 404 })

  const [bundleConns, assignedUsers] = await Promise.all([
    db
      .select({
        connectorId: bundleConnectors.connectorId,
        required:    bundleConnectors.required,
        name:        connectors.name,
        iconUrl:     connectors.iconUrl,
        authType:    connectors.authType,
        managedBy:   connectors.managedBy,
      })
      .from(bundleConnectors)
      .innerJoin(connectors, eq(bundleConnectors.connectorId, connectors.id))
      .where(eq(bundleConnectors.bundleId, id)),
    db
      .select({
        userId:     userBundles.userId,
        assignedAt: userBundles.assignedAt,
      })
      .from(userBundles)
      .where(eq(userBundles.bundleId, id)),
  ])

  return NextResponse.json({ ...bundle, connectors: bundleConns, assignedUsers })
}

const PatchSchema = z.object({
  name:        z.string().min(1).max(80).optional(),
  description: z.string().max(300).optional(),
  emoji:       z.string().max(8).optional(),
  connectors:  z.array(z.object({
    connectorId: z.string(),
    required:    z.boolean().default(false),
  })).optional(),
})

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: { code: 'forbidden' } }, { status: 403 })
  }

  const { id } = await params
  const [bundle] = await db.select().from(bundles).where(eq(bundles.id, id)).limit(1)
  if (!bundle) return NextResponse.json({ error: { code: 'not_found' } }, { status: 404 })

  const parsed = PatchSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'validation_error', message: parsed.error.message } }, { status: 400 })
  }

  const { connectors: newConnectors, ...bundleFields } = parsed.data

  if (Object.keys(bundleFields).length > 0) {
    await db.update(bundles).set({ ...bundleFields, updatedAt: new Date() }).where(eq(bundles.id, id))
  }

  if (newConnectors !== undefined) {
    await db.delete(bundleConnectors).where(eq(bundleConnectors.bundleId, id))
    if (newConnectors.length > 0) {
      await db.insert(bundleConnectors).values(
        newConnectors.map(c => ({ bundleId: id, connectorId: c.connectorId, required: c.required }))
      )
    }
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: { code: 'forbidden' } }, { status: 403 })
  }

  const { id } = await params
  const [bundle] = await db.select().from(bundles).where(eq(bundles.id, id)).limit(1)
  if (!bundle) return NextResponse.json({ error: { code: 'not_found' } }, { status: 404 })

  await db.delete(bundles).where(eq(bundles.id, id))

  await db.insert(auditLogs).values({
    actorId: session.user.id,
    action:  'bundle.deleted',
    detail:  { bundleId: id, name: bundle.name },
  })

  return NextResponse.json({ ok: true })
}
