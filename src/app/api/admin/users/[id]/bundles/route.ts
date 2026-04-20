import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { db } from '@/lib/db'
import { users, bundles, bundleConnectors, userBundles, userConnectorConfigs, connectors, auditLogs } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: RouteParams) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: { code: 'forbidden' } }, { status: 403 })

  const { id: userId } = await params

  const assigned = await db
    .select({
      bundleId:    userBundles.bundleId,
      assignedAt:  userBundles.assignedAt,
      name:        bundles.name,
      emoji:       bundles.emoji,
      description: bundles.description,
    })
    .from(userBundles)
    .innerJoin(bundles, eq(userBundles.bundleId, bundles.id))
    .where(eq(userBundles.userId, userId))

  return NextResponse.json(assigned)
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: { code: 'forbidden' } }, { status: 403 })

  const { id: userId } = await params
  const { bundleId } = z.object({ bundleId: z.string().uuid() }).parse(await req.json())

  const [[user], [bundle]] = await Promise.all([
    db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1),
    db.select().from(bundles).where(eq(bundles.id, bundleId)).limit(1),
  ])
  if (!user) return NextResponse.json({ error: { code: 'not_found', message: 'User not found' } }, { status: 404 })
  if (!bundle) return NextResponse.json({ error: { code: 'not_found', message: 'Bundle not found' } }, { status: 404 })

  await db
    .insert(userBundles)
    .values({ userId, bundleId, assignedBy: admin.userId })
    .onConflictDoNothing()

  const bundleConns = await db
    .select({
      connectorId: bundleConnectors.connectorId,
      required:    bundleConnectors.required,
      authType:    connectors.authType,
      managedBy:   connectors.managedBy,
    })
    .from(bundleConnectors)
    .innerJoin(connectors, eq(bundleConnectors.connectorId, connectors.id))
    .where(and(eq(bundleConnectors.bundleId, bundleId), eq(connectors.status, 'active')))

  const autoProvision = bundleConns.filter(
    c => c.managedBy === 'admin' || c.authType === 'none'
  )

  if (autoProvision.length > 0) {
    await db
      .insert(userConnectorConfigs)
      .values(
        autoProvision.map(c => ({
          userId,
          connectorId:          c.connectorId,
          encryptedConfig:      '',
          encryptionKeyVersion: process.env.ENCRYPTION_KEY_VERSION ?? '1',
          enabled:              true,
        }))
      )
      .onConflictDoUpdate({
        target: [userConnectorConfigs.userId, userConnectorConfigs.connectorId],
        set:    { enabled: true, updatedAt: new Date() },
      })
  }

  await db.insert(auditLogs).values({
    actorId:      admin.userId,
    targetUserId: userId,
    action:       'bundle.assigned',
    detail:       { bundleId, bundleName: bundle.name, autoProvisioned: autoProvision.length },
  })

  return NextResponse.json({ ok: true })
}
