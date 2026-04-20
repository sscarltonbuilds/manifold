import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { db } from '@/lib/db'
import { connectors, connectorPolicies, auditLogs } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

const PolicySchema = z.object({
  required:         z.boolean().optional(),
  logToolCalls:     z.boolean().optional(),
  visibleToRoles:   z.array(z.enum(['member', 'admin'])).optional(),
  disabledTools:    z.array(z.string()).optional(),
  rateLimitPerHour: z.record(z.string(), z.number().int().positive()).nullable().optional(),
})

export async function GET(req: NextRequest, { params }: RouteParams) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: { code: 'forbidden' } }, { status: 403 })

  const { id } = await params
  const [policy] = await db.select().from(connectorPolicies).where(eq(connectorPolicies.connectorId, id)).limit(1)
  if (!policy) return NextResponse.json({ error: { code: 'not_found' } }, { status: 404 })
  return NextResponse.json({ policy })
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: { code: 'forbidden' } }, { status: 403 })

  const { id } = await params
  const [connector] = await db.select().from(connectors).where(eq(connectors.id, id)).limit(1)
  if (!connector) return NextResponse.json({ error: { code: 'not_found' } }, { status: 404 })

  const parsed = PolicySchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'validation_error', message: parsed.error.message } }, { status: 400 })
  }

  await db
    .insert(connectorPolicies)
    .values({ connectorId: id, ...parsed.data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: connectorPolicies.connectorId,
      set: { ...parsed.data, updatedAt: new Date() },
    })

  await db.insert(auditLogs).values({
    actorId:     admin.userId,
    connectorId: id,
    action:      'connector.policy_updated',
    detail:      parsed.data,
  })

  return NextResponse.json({ ok: true })
}
