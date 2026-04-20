import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { db } from '@/lib/db'
import { bundles, bundleConnectors, auditLogs } from '@/lib/db/schema'
import { sql } from 'drizzle-orm'
import { z } from 'zod'

const CreateSchema = z.object({
  name:         z.string().min(1).max(80),
  description:  z.string().max(300).default(''),
  emoji:        z.string().max(8).default('📦'),
  connectorIds: z.array(z.string()).default([]),
})

export async function GET(req: Request) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: { code: 'forbidden' } }, { status: 403 })

  const rows = await db
    .select({
      id:             bundles.id,
      name:           bundles.name,
      description:    bundles.description,
      emoji:          bundles.emoji,
      createdAt:      bundles.createdAt,
      connectorCount: sql<number>`(select count(*) from bundle_connectors where bundle_id = ${bundles.id})::int`,
      userCount:      sql<number>`(select count(*) from user_bundles where bundle_id = ${bundles.id})::int`,
    })
    .from(bundles)
    .orderBy(bundles.createdAt)

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: { code: 'forbidden' } }, { status: 403 })

  const parsed = CreateSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'validation_error', message: parsed.error.message } }, { status: 400 })
  }

  const { name, description, emoji, connectorIds } = parsed.data

  const [bundle] = await db
    .insert(bundles)
    .values({ name, description, emoji, createdBy: admin.userId })
    .returning()

  if (connectorIds.length > 0) {
    await db.insert(bundleConnectors).values(
      connectorIds.map(connectorId => ({ bundleId: bundle.id, connectorId, required: false }))
    )
  }

  await db.insert(auditLogs).values({
    actorId: admin.userId,
    action:  'bundle.created',
    detail:  { bundleId: bundle.id, name },
  })

  return NextResponse.json({ ok: true, id: bundle.id })
}
