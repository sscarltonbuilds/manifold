import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { connectors, connectorOAuthStates, connectorAdminConfigs } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { generateToken, decrypt } from '@/lib/crypto'
import { env } from '@/lib/env'
import type { Manifest } from '@/lib/manifest'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.redirect(new URL('/login', req.url))

  const { id } = await params

  const [connector] = await db.select().from(connectors).where(eq(connectors.id, id)).limit(1)
  if (!connector) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const manifest = connector.manifest as Manifest
  if (manifest.auth.type !== 'oauth2') {
    return NextResponse.json({ error: 'connector does not use oauth2' }, { status: 400 })
  }

  // Load admin OAuth credentials for this connector
  const [adminCfg] = await db
    .select()
    .from(connectorAdminConfigs)
    .where(eq(connectorAdminConfigs.connectorId, id))
    .limit(1)

  if (!adminCfg) {
    return NextResponse.redirect(
      new URL(`/connectors?oauth_error=${encodeURIComponent('OAuth client credentials not configured. Ask your admin.')}`, req.url)
    )
  }

  const oauthCreds = JSON.parse(decrypt(adminCfg.encryptedConfig)) as { client_id?: string; client_secret?: string }
  if (!oauthCreds.client_id) {
    return NextResponse.redirect(
      new URL(`/connectors?oauth_error=${encodeURIComponent('client_id not configured for this connector.')}`, req.url)
    )
  }

  const state = generateToken()
  await db.insert(connectorOAuthStates).values({
    state,
    userId:      session.user.id,
    connectorId: id,
    expiresAt:   new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
  })

  const redirectUri = `${env.NEXT_PUBLIC_APP_URL}/oauth/connector/callback`
  const authUrl = new URL(manifest.auth.authorizeUrl)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', manifest.auth.scopes.join(' '))
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('client_id', oauthCreds.client_id)

  return NextResponse.redirect(authUrl.toString())
}
