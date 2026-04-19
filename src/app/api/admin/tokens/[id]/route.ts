import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { oauthTokens, auditLogs } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

type RouteParams = { params: Promise<{ id: string }> }

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: { code: 'forbidden' } }, { status: 403 })
  }

  const { id } = await params

  const [token] = await db.select().from(oauthTokens).where(eq(oauthTokens.id, id)).limit(1)
  if (!token) return NextResponse.json({ error: { code: 'not_found' } }, { status: 404 })

  await db.delete(oauthTokens).where(eq(oauthTokens.id, id))

  await db.insert(auditLogs).values({
    actorId:      session.user.id,
    targetUserId: token.userId,
    action:       'token.revoked',
    detail:       { tokenId: id, clientId: token.clientId },
  })

  return NextResponse.json({ ok: true })
}
