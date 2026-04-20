import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { bundles } from '@/lib/db/schema'
import { sql } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CreateBundleButton } from '@/components/admin/create-bundle-button'

export default async function AdminBundlesPage() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') redirect('/connectors')

  const rows = await db
    .select({
      id:             bundles.id,
      name:           bundles.name,
      description:    bundles.description,
      emoji:          bundles.emoji,
      createdAt:      bundles.createdAt,
      connectorCount: sql<number>`(select count(*) from bundle_connectors where bundle_id = ${bundles.id})::int`,
      userCount:      sql<number>`(select count(*) from user_bundles where bundle_id = ${bundles.id})::int`,
    })
    .from(bundles)
    .orderBy(bundles.createdAt)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[#1A1917] text-2xl font-medium tracking-tight">Bundles</h1>
          <p className="text-[#6B6966] text-sm mt-1">
            {rows.length} bundle{rows.length !== 1 ? 's' : ''} · Curated connector sets assigned to users
          </p>
        </div>
        <CreateBundleButton />
      </div>

      {rows.length === 0 ? (
        <div className="bg-white border border-[#E3E1DC] rounded-[10px] px-8 py-12 flex flex-col items-center text-center gap-3">
          <div className="text-4xl">📦</div>
          <p className="text-[#1A1917] text-sm font-medium">No bundles yet.</p>
          <p className="text-[#9C9890] text-sm max-w-xs">
            Bundles are curated sets of connectors. Assign a bundle to a user and they inherit access to all its connectors instantly.
          </p>
          <CreateBundleButton />
        </div>
      ) : (
        <div className="bg-white border border-[#E3E1DC] rounded-[10px] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E3E1DC]">
                <th className="text-left px-5 py-3 text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em]">Bundle</th>
                <th className="text-left px-5 py-3 text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em]">Connectors</th>
                <th className="text-left px-5 py-3 text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em]">Users</th>
                <th className="text-left px-5 py-3 text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em]">Created</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E1DC]">
              {rows.map(b => (
                <tr key={b.id} className="group hover:bg-[#F9F8F6] transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="text-xl w-8 text-center">{b.emoji}</span>
                      <div>
                        <p className="text-[#1A1917] font-medium">{b.name}</p>
                        {b.description && (
                          <p className="text-[#6B6966] text-xs mt-0.5 max-w-xs truncate">{b.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[#6B6966]">{b.connectorCount}</td>
                  <td className="px-5 py-3.5 text-[#6B6966]">{b.userCount}</td>
                  <td className="px-5 py-3.5 text-[#6B6966]">
                    {new Date(b.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                      <Link
                        href={`/admin/bundles/${b.id}`}
                        className="h-7 px-3 inline-flex items-center text-xs font-medium text-[#1A1917] bg-white border border-[#E3E1DC] rounded-[6px] hover:bg-[#F5F4F0] hover:border-[#D4D0C8] transition-colors"
                      >
                        Manage
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
