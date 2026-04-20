import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { connectors, userConnectorConfigs, userBundles, bundleConnectors, bundles } from '@/lib/db/schema'
import { eq, ne } from 'drizzle-orm'
import { ConnectorCard } from '@/components/connectors/connector-card'
import { OAuthResultToast } from '@/components/connectors/oauth-result-toast'
import { redirect } from 'next/navigation'
import { Plug } from 'lucide-react'
import { getAuthFields } from '@/lib/manifest'
import type { Manifest } from '@/lib/manifest'
import { Suspense } from 'react'

export default async function ConnectorsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const userId = session.user.id

  const [activeConnectors, configs, bundleMemberships] = await Promise.all([
    db.select().from(connectors).where(ne(connectors.status, 'deprecated')),
    db.select().from(userConnectorConfigs).where(eq(userConnectorConfigs.userId, userId)),
    db
      .select({
        connectorId: bundleConnectors.connectorId,
        required:    bundleConnectors.required,
        bundleName:  bundles.name,
      })
      .from(userBundles)
      .innerJoin(bundles, eq(userBundles.bundleId, bundles.id))
      .innerJoin(bundleConnectors, eq(bundleConnectors.bundleId, bundles.id))
      .where(eq(userBundles.userId, userId)),
  ])

  const configMap = new Map(configs.map(c => [c.connectorId, c]))

  const bundleMap = new Map<string, { name: string; required: boolean }>()
  for (const m of bundleMemberships) {
    if (!bundleMap.has(m.connectorId)) {
      bundleMap.set(m.connectorId, { name: m.bundleName, required: m.required })
    }
  }

  if (activeConnectors.length === 0) {
    return (
      <div className="p-8 max-w-5xl">
        <Suspense><OAuthResultToast /></Suspense>
        <div className="mb-8">
          <h1 className="text-[#1A1917] text-2xl font-medium tracking-tight">Connectors</h1>
          <p className="text-[#6B6966] text-sm mt-1">Connect your tools to your AI assistant.</p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 bg-[#F5F4F0] border border-[#E3E1DC] rounded-[10px] flex items-center justify-center mb-4">
            <Plug size={20} className="text-[#9C9890]" strokeWidth={1.5} />
          </div>
          <p className="text-[#1A1917] text-sm font-medium">No connectors available.</p>
          <p className="text-[#9C9890] text-sm mt-1">Ask your admin to add one.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-5xl">
      <Suspense><OAuthResultToast /></Suspense>
      <div className="mb-8">
        <h1 className="text-[#1A1917] text-2xl font-medium tracking-tight">Connectors</h1>
        <p className="text-[#6B6966] text-sm mt-1">Connect your tools to your AI assistant.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeConnectors.map(connector => {
          const config = configMap.get(connector.id)
          const authFields = getAuthFields(connector.manifest as Manifest)
          return (
            <ConnectorCard
              key={connector.id}
              connector={{
                id:          connector.id,
                name:        connector.name,
                description: connector.description,
                iconUrl:     connector.iconUrl,
                status:      connector.status,
                authType:    connector.authType,
                managedBy:   connector.managedBy,
              }}
              authFields={authFields}
              enabled={config?.enabled ?? false}
              configured={!!config}
              userId={userId}
              bundleSource={bundleMap.get(connector.id)}
            />
          )
        })}
      </div>
    </div>
  )
}
