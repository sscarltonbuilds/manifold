import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { db } from '@/lib/db'
import { oauthTokens, users } from '@/lib/db/schema'
import { eq, gt } from 'drizzle-orm'

export async function GET(req: Request) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: { code: 'forbidden' } }, { status: 403 })

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
