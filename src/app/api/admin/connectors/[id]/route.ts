import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { db } from '@/lib/db'
import { connectors, auditLogs } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

const PatchSchema = z.object({
  status:   z.enum(['pending', 'active', 'deprecated']).optional(),
  endpoint: z.string().url().optional(),
  iconUrl:  z.string().max(2_000_000).nullable().optional(),
}).strict()

export async function GET(req: NextRequest, { params }: RouteParams) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: { code: 'forbidden' } }, { status: 403 })

  const { id } = await params
  const [row] = await db.select().from(connectors).where(eq(connectors.id, id)).limit(1)
  if (!row) return NextResponse.json({ error: { code: 'not_found' } }, { status: 404 })
  return NextResponse.json({ connector: row })
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: { code: 'forbidden' } }, { status: 403 })

  const { id } = await params
  const [existing] = await db.select().from(connectors).where(eq(connectors.id, id)).limit(1)
  if (!existing) return NextResponse.json({ error: { code: 'not_found' } }, { status: 404 })

  const parsed = PatchSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'validation_error', message: parsed.error.message } }, { status: 400 })
  }

  await db.update(connectors)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(connectors.id, id))

  await db.insert(auditLogs).values({
    actorId:     admin.userId,
    connectorId: id,
    action:      'connector.updated',
    detail:      parsed.data,
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: { code: 'forbidden' } }, { status: 403 })

  const { id } = await params
  const [existing] = await db.select().from(connectors).where(eq(connectors.id, id)).limit(1)
  if (!existing) return NextResponse.json({ error: { code: 'not_found' } }, { status: 404 })

  // Soft-delete: set status to deprecated
  await db.update(connectors)
    .set({ status: 'deprecated', updatedAt: new Date() })
    .where(eq(connectors.id, id))

  await db.insert(auditLogs).values({
    actorId:     admin.userId,
    connectorId: id,
    action:      'connector.deprecated',
    detail:      { name: existing.name },
  })

  return NextResponse.json({ ok: true })
}
