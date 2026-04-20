import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { users, userConnectorConfigs, invitations } from '@/lib/db/schema'
import { eq, sql, isNull } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { UsersTableClient } from '@/components/admin/users-table-client'

export default async function AdminUsersPage() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') redirect('/connectors')

  const [rows, pendingInvites] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        avatarUrl: users.avatarUrl,
        role: users.role,
        createdAt: users.createdAt,
        connectorCount: sql<number>`count(${userConnectorConfigs.id})::int`,
      })
      .from(users)
      .leftJoin(userConnectorConfigs, eq(users.id, userConnectorConfigs.userId))
      .groupBy(users.id)
      .orderBy(users.createdAt),
    db
      .select({
        id: invitations.id,
        email: invitations.email,
        role: invitations.role,
        expiresAt: invitations.expiresAt,
        createdAt: invitations.createdAt,
      })
      .from(invitations)
      .where(isNull(invitations.acceptedAt)),
  ])

  const serializedRows = rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() }))
  const serializedInvites = pendingInvites.map(i => ({
    ...i,
    role: i.role.toString(),
    expiresAt: i.expiresAt.toISOString(),
    createdAt: i.createdAt.toISOString(),
  }))

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-[#1A1917] text-2xl font-medium tracking-tight">Users</h1>
        <p className="text-[#9C9890] text-xs mt-1">
          Domain restrictions are managed in{' '}
          <a href="/admin/settings#access" className="text-[#C4853A] hover:underline">Settings → Access control</a>.
        </p>
      </div>
      <UsersTableClient rows={serializedRows} initialInvites={serializedInvites} />
    </div>
  )
}
