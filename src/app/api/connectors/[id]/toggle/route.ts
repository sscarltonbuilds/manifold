import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { userConnectorConfigs, auditLogs } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

const schema = z.object({ enabled: z.boolean() })

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: 'unauthorized' } }, { status: 401 })
  }

  const { id } = await params
  const body = schema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: { code: 'invalid_request' } }, { status: 400 })
  }

  await db
    .update(userConnectorConfigs)
    .set({ enabled: body.data.enabled, updatedAt: new Date() })
    .where(and(eq(userConnectorConfigs.userId, session.user.id), eq(userConnectorConfigs.connectorId, id)))

  await db.insert(auditLogs).values({
    actorId: session.user.id,
    targetUserId: session.user.id,
    action: body.data.enabled ? 'connector.enabled' : 'connector.disabled',
    detail: { connectorId: id },
  })

  return NextResponse.json({ ok: true })
}
