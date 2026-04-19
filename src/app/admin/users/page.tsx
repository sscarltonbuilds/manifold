import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { users, userConnectorConfigs } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Crown, User } from 'lucide-react'

export default async function AdminUsersPage() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') redirect('/connectors')

  const rows = await db
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
    .orderBy(users.createdAt)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-[#1A1917] text-2xl font-medium tracking-tight">Users</h1>
        <p className="text-[#6B6966] text-sm mt-1">{rows.length} member{rows.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="bg-white border border-[#E3E1DC] rounded-[10px] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E3E1DC]">
              <th className="text-left px-5 py-3 text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em]">User</th>
              <th className="text-left px-5 py-3 text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em]">Role</th>
              <th className="text-left px-5 py-3 text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em]">Connectors</th>
              <th className="text-left px-5 py-3 text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em]">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E3E1DC]">
            {rows.map(user => (
              <tr key={user.id} className="hover:bg-[#F5F4F0] transition-colors">
                <td className="px-5 py-3.5">
                  <Link href={`/admin/users/${user.id}`} className="flex items-center gap-3 group">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="w-7 h-7 rounded-full flex-none" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-[#C4853A] flex items-center justify-center flex-none">
                        <span className="text-[#1A1917] text-xs font-bold">
                          {user.name.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-[#1A1917] font-medium group-hover:text-[#C4853A] transition-colors">{user.name}</p>
                      <p className="text-[#6B6966] text-xs">{user.email}</p>
                    </div>
                  </Link>
                </td>
                <td className="px-5 py-3.5">
                  {user.role === 'admin' ? (
                    <span className="inline-flex items-center gap-1 text-[#C4853A] bg-[#FBF3E8] text-[11px] font-semibold tracking-[0.06em] uppercase px-2 py-0.5 rounded-full">
                      <Crown size={10} />Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[#6B6966] bg-[#F0EFE9] text-[11px] font-semibold tracking-[0.06em] uppercase px-2 py-0.5 rounded-full">
                      <User size={10} />Member
                    </span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-[#6B6966]">{user.connectorCount}</td>
                <td className="px-5 py-3.5 text-[#6B6966]">
                  {new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length === 0 && (
          <div className="py-12 text-center text-[#9C9890] text-sm">No users yet.</div>
        )}
      </div>
    </div>
  )
}
