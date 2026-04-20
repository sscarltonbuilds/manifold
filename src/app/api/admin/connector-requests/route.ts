import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { db } from '@/lib/db'
import { connectorRequests, users, connectors } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: { code: 'forbidden' } }, { status: 403 })

  const rows = await db
    .select({
      id:            connectorRequests.id,
      status:        connectorRequests.status,
      connectorName: connectorRequests.connectorName,
      message:       connectorRequests.message,
      createdAt:     connectorRequests.createdAt,
      updatedAt:     connectorRequests.updatedAt,
      userName:      users.name,
      userEmail:     users.email,
      connectorId:   connectorRequests.connectorId,
      registeredConnectorName: connectors.name,
    })
    .from(connectorRequests)
    .innerJoin(users, eq(connectorRequests.userId, users.id))
    .leftJoin(connectors, eq(connectorRequests.connectorId, connectors.id))
    .orderBy(connectorRequests.createdAt)

  return NextResponse.json({ requests: rows })
}
