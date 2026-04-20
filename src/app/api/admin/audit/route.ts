import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { db } from '@/lib/db'
import { auditLogs, users } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: { code: 'forbidden' } }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)

  const rows = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      detail: auditLogs.detail,
      createdAt: auditLogs.createdAt,
      actor: { id: users.id, name: users.name, email: users.email },
    })
    .from(auditLogs)
    .innerJoin(users, eq(auditLogs.actorId, users.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)

  return NextResponse.json(rows)
}
