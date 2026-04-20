import { auth } from '@/lib/auth'
import { signOut } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { bundles, bundleConnectors, userBundles, connectors } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { TokenManager } from '@/components/settings/token-manager'

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const userId = session.user.id

  // Fetch bundle data server-side
  const bundleRows = await db
    .select({
      bundleId:      bundles.id,
      bundleName:    bundles.name,
      bundleEmoji:   bundles.emoji,
      bundleDesc:    bundles.description,
      connectorId:   bundleConnectors.connectorId,
      connectorName: connectors.name,
      required:      bundleConnectors.required,
      assignedAt:    userBundles.assignedAt,
    })
    .from(userBundles)
    .innerJoin(bundles, eq(userBundles.bundleId, bundles.id))
    .innerJoin(bundleConnectors, eq(bundleConnectors.bundleId, bundles.id))
    .innerJoin(connectors, eq(connectors.id, bundleConnectors.connectorId))
    .where(eq(userBundles.userId, userId))
    .orderBy(userBundles.assignedAt)

  // Group connectors by bundle
  const bundleMap = new Map<string, {
    id:          string
    name:        string
    emoji:       string
    description: string
    assignedAt:  Date
    connectors:  Array<{ id: string; name: string; required: boolean }>
  }>()

  for (const row of bundleRows) {
    if (!bundleMap.has(row.bundleId)) {
      bundleMap.set(row.bundleId, {
        id:          row.bundleId,
        name:        row.bundleName,
        emoji:       row.bundleEmoji,
        description: row.bundleDesc,
        assignedAt:  row.assignedAt,
        connectors:  [],
      })
    }
    bundleMap.get(row.bundleId)!.connectors.push({
      id:       row.connectorId,
      name:     row.connectorName,
      required: row.required,
    })
  }

  const bundleList = Array.from(bundleMap.values())

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-[#1A1917] text-2xl font-medium tracking-tight">Settings</h1>
      </div>

      {/* Profile */}
      <section className="mb-8">
        <h2 className="text-[#1A1917] text-sm font-semibold uppercase tracking-[0.08em] mb-3">
          Profile
        </h2>
        <div className="bg-white border border-[#E3E1DC] rounded-[10px] p-6 flex flex-col gap-5">
          <div>
            <label className="text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em]">
              Name
            </label>
            <p className="text-[#1A1917] text-sm mt-1">{session.user.name}</p>
          </div>

          <div>
            <label className="text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em]">
              Email
            </label>
            <p className="text-[#1A1917] text-sm mt-1">{session.user.email}</p>
          </div>

          <div className="pt-2 border-t border-[#E3E1DC]">
            <form
              action={async () => {
                'use server'
                await signOut({ redirectTo: '/login' })
              }}
            >
              <button
                type="submit"
                className="text-sm text-[#A3352B] hover:underline"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* API Access */}
      <section className="mb-8">
        <h2 className="text-[#1A1917] text-sm font-semibold uppercase tracking-[0.08em] mb-1">
          API Access
        </h2>
        <p className="text-[#9C9890] text-xs mb-3">
          Bearer tokens used by AI tools to access your connectors.
        </p>
        <TokenManager />
      </section>

      {/* Bundles */}
      <section>
        <h2 className="text-[#1A1917] text-sm font-semibold uppercase tracking-[0.08em] mb-1">
          Bundles
        </h2>
        <p className="text-[#9C9890] text-xs mb-3">
          Connector groups assigned to you by your admin.
        </p>

        {bundleList.length === 0 ? (
          <div className="bg-white border border-[#E3E1DC] rounded-[10px] px-5 py-8 text-center">
            <p className="text-[#9C9890] text-sm">No bundles assigned. Contact your admin.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {bundleList.map(bundle => (
              <div key={bundle.id} className="bg-white border border-[#E3E1DC] rounded-[10px] p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg leading-none">{bundle.emoji}</span>
                    <span className="text-[#1A1917] text-sm font-medium">{bundle.name}</span>
                  </div>
                  <span className="text-[#9C9890] text-[10px] flex-none">
                    assigned {formatDate(bundle.assignedAt)}
                  </span>
                </div>

                {bundle.description && (
                  <p className="text-[#6B6966] text-xs mb-3">{bundle.description}</p>
                )}

                <div className="flex flex-wrap gap-1.5">
                  {bundle.connectors.map(c => (
                    <span
                      key={c.id}
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        c.required
                          ? 'bg-[#FBF3E8] text-[#C4853A]'
                          : 'bg-[#F5F4F0] text-[#6B6966]'
                      }`}
                    >
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
