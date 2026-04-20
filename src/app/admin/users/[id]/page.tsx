import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { users, connectors, userConnectorConfigs, userBundles, bundles } from '@/lib/db/schema'
import { eq, ne } from 'drizzle-orm'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, CheckCircle2, Circle } from 'lucide-react'
import { AdminUserRoleToggle } from '@/components/admin/admin-user-role-toggle'
import { AdminConfigureOnBehalf } from '@/components/admin/admin-configure-on-behalf'
import { UserBundlesSection } from '@/components/admin/user-bundles-section'
import { getAuthFields } from '@/lib/manifest'
import type { Manifest } from '@/lib/manifest'

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') redirect('/connectors')

  const { id } = await params
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1)
  if (!user) notFound()

  const [activeConnectors, configs, assignedBundles, allBundles] = await Promise.all([
    db.select().from(connectors).where(ne(connectors.status, 'deprecated')),
    db.select().from(userConnectorConfigs).where(eq(userConnectorConfigs.userId, id)),
    db
      .select({
        bundleId:    userBundles.bundleId,
        assignedAt:  userBundles.assignedAt,
        name:        bundles.name,
        emoji:       bundles.emoji,
        description: bundles.description,
      })
      .from(userBundles)
      .innerJoin(bundles, eq(userBundles.bundleId, bundles.id))
      .where(eq(userBundles.userId, id)),
    db.select({ id: bundles.id, name: bundles.name, emoji: bundles.emoji }).from(bundles),
  ])

  const connectorList = activeConnectors.map(c => ({
    id:         c.id,
    name:       c.name,
    iconUrl:    c.iconUrl,
    status:     c.status,
    managedBy:  c.managedBy,
    authFields: getAuthFields(c.manifest as Manifest),
    config:     configs.find(cfg => cfg.connectorId === c.id) ?? null,
  }))

  const isSelf = session.user.id === id

  return (
    <div className="p-8 max-w-3xl">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1 text-[#6B6966] hover:text-[#1A1917] text-sm mb-6 transition-colors"
      >
        <ChevronLeft size={14} />Users
      </Link>

      <div className="bg-white border border-[#E3E1DC] rounded-[10px] p-6 mb-6 flex items-center gap-4">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" className="w-12 h-12 rounded-full flex-none" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-[#C4853A] flex items-center justify-center flex-none">
            <span className="text-[#1A1917] text-sm font-bold">{user.name.slice(0, 2).toUpperCase()}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-[#1A1917] text-lg font-medium">{user.name}</h1>
          <p className="text-[#6B6966] text-sm">{user.email}</p>
        </div>
        {!isSelf ? (
          <AdminUserRoleToggle userId={id} currentRole={user.role} />
        ) : (
          <span className="text-xs text-[#9C9890]">That&apos;s you</span>
        )}
      </div>

      <UserBundlesSection
        userId={id}
        assignedBundles={assignedBundles.map(b => ({ ...b, assignedAt: b.assignedAt.toISOString() }))}
        allBundles={allBundles}
      />

      <div>
        <h2 className="text-[#1A1917] text-sm font-semibold uppercase tracking-[0.08em] mb-3">Connectors</h2>

        {connectorList.length === 0 ? (
          <div className="bg-white border border-[#E3E1DC] rounded-[10px] px-5 py-8 text-center">
            <p className="text-[#9C9890] text-sm">No connectors registered yet.</p>
          </div>
        ) : (
          <div className="bg-white border border-[#E3E1DC] rounded-[10px] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E3E1DC]">
                  <th className="text-left px-5 py-3 text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em]">Connector</th>
                  <th className="text-left px-5 py-3 text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em]">Status</th>
                  <th className="text-left px-5 py-3 text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em]">Enabled</th>
                  <th className="text-left px-5 py-3 text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em]">Updated</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E1DC]">
                {connectorList.map(c => (
                  <tr key={c.id}>
                    <td className="px-5 py-3 text-[#1A1917] font-medium">{c.name}</td>
                    <td className="px-5 py-3">
                      {c.config ? (
                        <span className="inline-flex items-center gap-1 text-[#4A7C59] text-[11px] font-semibold uppercase tracking-[0.06em]">
                          <CheckCircle2 size={11} />Configured
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#9C9890] text-[11px] font-semibold uppercase tracking-[0.06em]">
                          <Circle size={11} />Not configured
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[11px] font-semibold uppercase tracking-[0.06em] ${c.config?.enabled ? 'text-[#4A7C59]' : 'text-[#9C9890]'}`}>
                        {c.config?.enabled ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[#6B6966] text-xs">
                      {c.config
                        ? new Date(c.config.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {c.managedBy === 'user' && (
                        <AdminConfigureOnBehalf
                          userId={id}
                          connector={{ id: c.id, name: c.name, iconUrl: c.iconUrl, authFields: c.authFields }}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
