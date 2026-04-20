import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { connectorRequests } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

const BodySchema = z.object({
  connectorId:   z.string().optional(),
  connectorName: z.string().max(200).optional(),
  message:       z.string().max(1000).optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: 'unauthorized' } }, { status: 401 })
  }

  const parsed = BodySchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'validation_error', message: parsed.error.message } }, { status: 400 })
  }

  const { connectorId, connectorName, message } = parsed.data

  // Check for existing pending request for the same connector (if connectorId given)
  if (connectorId) {
    const [existing] = await db
      .select({ id: connectorRequests.id })
      .from(connectorRequests)
      .where(
        and(
          eq(connectorRequests.userId, session.user.id),
          eq(connectorRequests.connectorId, connectorId),
          eq(connectorRequests.status, 'pending')
        )
      )
      .limit(1)

    if (existing) {
      return NextResponse.json({ error: { code: 'conflict', message: 'A pending request already exists for this connector.' } }, { status: 409 })
    }
  }

  await db.insert(connectorRequests).values({
    userId:        session.user.id,
    connectorId:   connectorId ?? null,
    connectorName: connectorName ?? null,
    message:       message ?? null,
    status:        'pending',
  })

  return NextResponse.json({ ok: true })
}
