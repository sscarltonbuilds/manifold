import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { users, userConnectorConfigs } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: { code: 'forbidden' } }, { status: 403 })
  }

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      avatarUrl: users.avatarUrl,
      role: users.role,
      createdAt: users.createdAt,
      lastActiveAt: users.lastActiveAt,
      connectorCount: sql<number>`count(${userConnectorConfigs.id})::int`,
    })
    .from(users)
    .leftJoin(
      userConnectorConfigs,
      eq(users.id, userConnectorConfigs.userId)
    )
    .groupBy(users.id)
    .orderBy(users.createdAt)

  return NextResponse.json({ users: rows })
}
