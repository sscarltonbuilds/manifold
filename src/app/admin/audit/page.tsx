import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { auditLogs, users } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { AuditLogClient } from '@/components/admin/audit-log-client'

export default async function AdminAuditPage() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') redirect('/connectors')

  const rows = await db
    .select({
      id:          auditLogs.id,
      action:      auditLogs.action,
      detail:      auditLogs.detail,
      createdAt:   auditLogs.createdAt,
      connectorId: auditLogs.connectorId,
      actorName:   users.name,
      actorEmail:  users.email,
    })
    .from(auditLogs)
    .innerJoin(users, eq(auditLogs.actorId, users.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(500)

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-[#1A1917] text-2xl font-medium tracking-tight">Audit Log</h1>
        <p className="text-[#6B6966] text-sm mt-1">Last {rows.length} events across the platform.</p>
      </div>

      <AuditLogClient rows={rows} />
    </div>
  )
}
