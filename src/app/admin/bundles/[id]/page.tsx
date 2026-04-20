import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { bundles, bundleConnectors, userBundles, connectors, users } from '@/lib/db/schema'
import { eq, ne } from 'drizzle-orm'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { BundleDetailClient } from '@/components/admin/bundle-detail-client'

export default async function AdminBundleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') redirect('/connectors')

  const { id } = await params

  const [bundle] = await db.select().from(bundles).where(eq(bundles.id, id)).limit(1)
  if (!bundle) notFound()

  const [bundleConns, assignedUsers, allConnectors, allUsers] = await Promise.all([
    db
      .select({
        connectorId: bundleConnectors.connectorId,
        required:    bundleConnectors.required,
        name:        connectors.name,
        iconUrl:     connectors.iconUrl,
        authType:    connectors.authType,
        managedBy:   connectors.managedBy,
      })
      .from(bundleConnectors)
      .innerJoin(connectors, eq(bundleConnectors.connectorId, connectors.id))
      .where(eq(bundleConnectors.bundleId, id)),
    db
      .select({
        userId:     userBundles.userId,
        assignedAt: userBundles.assignedAt,
        name:       users.name,
        email:      users.email,
        avatarUrl:  users.avatarUrl,
      })
      .from(userBundles)
      .innerJoin(users, eq(userBundles.userId, users.id))
      .where(eq(userBundles.bundleId, id)),
    db
      .select({ id: connectors.id, name: connectors.name, iconUrl: connectors.iconUrl, authType: connectors.authType, managedBy: connectors.managedBy })
      .from(connectors)
      .where(ne(connectors.status, 'deprecated')),
    db
      .select({ id: users.id, name: users.name, email: users.email, avatarUrl: users.avatarUrl })
      .from(users),
  ])

  const serializedBundle = {
    ...bundle,
    createdAt: bundle.createdAt.toISOString(),
    updatedAt: bundle.updatedAt.toISOString(),
  }

  return (
    <div className="p-8 max-w-4xl">
      <Link
        href="/admin/bundles"
        className="inline-flex items-center gap-1 text-[#6B6966] hover:text-[#1A1917] text-sm mb-6 transition-colors"
      >
        <ChevronLeft size={14} />Bundles
      </Link>

      <BundleDetailClient
        bundle={serializedBundle}
        bundleConnectors={bundleConns}
        assignedUsers={assignedUsers.map(u => ({ ...u, assignedAt: u.assignedAt.toISOString() }))}
        allConnectors={allConnectors}
        allUsers={allUsers}
      />
    </div>
  )
}
