import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { oauthTokens } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: 'unauthorized' } }, { status: 401 })
  }

  const tokens = await db
    .select({
      id:        oauthTokens.id,
      name:      oauthTokens.name,
      clientId:  oauthTokens.clientId,
      createdAt: oauthTokens.createdAt,
      expiresAt: oauthTokens.expiresAt,
    })
    .from(oauthTokens)
    .where(eq(oauthTokens.userId, session.user.id))
    .orderBy(oauthTokens.createdAt)

  return NextResponse.json({ tokens })
}
