import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { oauthTokens, users } from '@/lib/db/schema'
import { eq, gt } from 'drizzle-orm'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: { code: 'forbidden' } }, { status: 403 })
  }

  const now = new Date()
  const rows = await db
    .select({
      id:        oauthTokens.id,
      clientId:  oauthTokens.clientId,
      expiresAt: oauthTokens.expiresAt,
      createdAt: oauthTokens.createdAt,
      userEmail: users.email,
    })
    .from(oauthTokens)
    .leftJoin(users, eq(oauthTokens.userId, users.id))
    .where(gt(oauthTokens.expiresAt, now))
    .orderBy(oauthTokens.createdAt)

  return NextResponse.json({ tokens: rows })
}
