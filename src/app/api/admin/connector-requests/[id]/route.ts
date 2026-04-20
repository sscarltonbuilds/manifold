import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { db } from '@/lib/db'
import { connectorRequests } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

const PatchSchema = z.object({
  status: z.enum(['noted', 'dismissed']),
})

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: { code: 'forbidden' } }, { status: 403 })

  const { id } = await params

  const parsed = PatchSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'validation_error', message: parsed.error.message } }, { status: 400 })
  }

  const [row] = await db
    .select({ id: connectorRequests.id })
    .from(connectorRequests)
    .where(eq(connectorRequests.id, id))
    .limit(1)

  if (!row) return NextResponse.json({ error: { code: 'not_found' } }, { status: 404 })

  await db.update(connectorRequests)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(connectorRequests.id, id))

  return NextResponse.json({ ok: true })
}
