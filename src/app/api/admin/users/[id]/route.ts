import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { users, connectors, userConnectorConfigs, auditLogs } from '@/lib/db/schema'
import { eq, ne } from 'drizzle-orm'
import { z } from 'zod'
import { sql } from 'drizzle-orm'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: { code: 'forbidden' } }, { status: 403 })
  }

  const { id } = await params
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1)
  if (!user) return NextResponse.json({ error: { code: 'not_found' } }, { status: 404 })

  const [activeConnectors, configs] = await Promise.all([
    db.select().from(connectors).where(ne(connectors.status, 'deprecated')),
    db.select().from(userConnectorConfigs).where(eq(userConnectorConfigs.userId, id)),
  ])

  const connectorList = activeConnectors.map(c => ({
    id:        c.id,
    name:      c.name,
    iconUrl:   c.iconUrl,
    status:    c.status,
    authType:  c.authType,
    managedBy: c.managedBy,
    config:    configs.find(cfg => cfg.connectorId === c.id) ?? null,
  }))

  return NextResponse.json({ user, connectors: connectorList })
}

const patchSchema = z.object({ role: z.enum(['member', 'admin']) })

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: { code: 'forbidden' } }, { status: 403 })
  }

  const { id } = await params

  if (id === session.user.id) {
    return NextResponse.json(
      { error: { code: 'forbidden', message: 'Cannot change your own role' } },
      { status: 403 }
    )
  }

  const body = patchSchema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: { code: 'validation_error' } }, { status: 400 })
  }

  if (body.data.role === 'member') {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.role, 'admin'))
    if (count <= 1) {
      return NextResponse.json(
        { error: { code: 'forbidden', message: 'At least one admin must remain' } },
        { status: 403 }
      )
    }
  }

  await db.update(users).set({ role: body.data.role }).where(eq(users.id, id))

  await db.insert(auditLogs).values({
    actorId:      session.user.id,
    targetUserId: id,
    action:       'user.role_changed',
    detail:       { newRole: body.data.role },
  })

  return NextResponse.json({ ok: true })
}
