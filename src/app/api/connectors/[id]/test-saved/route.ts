import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { connectors, userConnectorConfigs, connectorAdminConfigs } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { decrypt } from '@/lib/crypto'
import { connectAndDiscover } from '@/lib/mcp/discovery'
import type { Manifest, Injection } from '@/lib/manifest'

type RouteParams = { params: Promise<{ id: string }> }

/**
 * POST /api/connectors/[id]/test-saved
 *
 * Tests the connection using the user's saved (decrypted) credentials — no
 * credential values are accepted in the request body. Useful for verifying
 * an existing configuration is still working without re-entering secrets.
 */
export async function POST(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: 'unauthorized' } }, { status: 401 })
  }

  const { id } = await params
  const [connector] = await db.select().from(connectors).where(eq(connectors.id, id)).limit(1)
  if (!connector) {
    return NextResponse.json({ error: { code: 'not_found' } }, { status: 404 })
  }

  const manifest = connector.manifest as Manifest

  // Resolve credentials — admin-managed uses org config, user-managed uses personal config
  let decryptedConfig: Record<string, string>

  if (connector.managedBy === 'admin') {
    const [adminConfig] = await db
      .select()
      .from(connectorAdminConfigs)
      .where(eq(connectorAdminConfigs.connectorId, id))
      .limit(1)

    if (!adminConfig) {
      return NextResponse.json({
        ok: false,
        message: 'No admin credentials configured for this connector.',
      })
    }
    decryptedConfig = JSON.parse(decrypt(adminConfig.encryptedConfig)) as Record<string, string>
  } else {
    const [userConfig] = await db
      .select()
      .from(userConnectorConfigs)
      .where(and(
        eq(userConnectorConfigs.userId, session.user.id),
        eq(userConnectorConfigs.connectorId, id),
      ))
      .limit(1)

    if (!userConfig) {
      return NextResponse.json({
        ok: false,
        message: 'No saved credentials found. Configure the connector first.',
      })
    }
    decryptedConfig = JSON.parse(decrypt(userConfig.encryptedConfig)) as Record<string, string>
  }

  // Build credential headers from manifest injection spec
  const headers: Record<string, string> = {}
  const auth_ = manifest.auth

  if (auth_.type === 'api_key' || auth_.type === 'bearer_token') {
    for (const field of auth_.fields) {
      if (!field.injection) continue
      const value = decryptedConfig[field.key]
      if (!value) continue
      const injection = field.injection as Injection
      if (injection.method === 'header') {
        headers[injection.name] = value
      } else if (injection.method === 'bearer') {
        headers['Authorization'] = `Bearer ${value}`
      }
      // query params aren't relevant for the test — discovery handles them separately
    }
  }

  try {
    const tools = await connectAndDiscover(connector.endpoint, headers)
    return NextResponse.json({
      ok: true,
      message: `Connected — ${tools.length} tool${tools.length === 1 ? '' : 's'} available`,
      toolCount: tools.length,
    })
  } catch (err) {
    return NextResponse.json({
      ok: false,
      message: err instanceof Error ? err.message : 'Connection test failed',
    })
  }
}
