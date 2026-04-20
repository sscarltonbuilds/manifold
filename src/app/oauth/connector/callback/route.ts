import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { connectors, connectorOAuthStates, connectorAdminConfigs, userConnectorConfigs } from '@/lib/db/schema'
import { eq, and, gt } from 'drizzle-orm'
import { decrypt, encrypt, computeConfigHmac } from '@/lib/crypto'
import { env } from '@/lib/env'
import type { Manifest } from '@/lib/manifest'

export async function GET(req: Request) {
  const url   = new URL(req.url)
  const code  = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  const appUrl = env.NEXT_PUBLIC_APP_URL

  if (error || !code || !state) {
    return NextResponse.redirect(`${appUrl}/connectors?oauth_error=${encodeURIComponent(error ?? 'missing_params')}`)
  }

  // Validate state
  const [stateRow] = await db
    .select()
    .from(connectorOAuthStates)
    .where(and(eq(connectorOAuthStates.state, state), gt(connectorOAuthStates.expiresAt, new Date())))
    .limit(1)

  if (!stateRow) {
    return NextResponse.redirect(`${appUrl}/connectors?oauth_error=invalid_state`)
  }

  // Delete used state
  await db.delete(connectorOAuthStates).where(eq(connectorOAuthStates.id, stateRow.id))

  const { userId, connectorId } = stateRow

  // Load connector + admin creds
  const [connector] = await db.select().from(connectors).where(eq(connectors.id, connectorId)).limit(1)
  if (!connector) return NextResponse.redirect(`${appUrl}/connectors?oauth_error=connector_not_found`)

  const manifest = connector.manifest as Manifest
  if (manifest.auth.type !== 'oauth2') return NextResponse.redirect(`${appUrl}/connectors?oauth_error=bad_connector`)

  const [adminCfg] = await db.select().from(connectorAdminConfigs).where(eq(connectorAdminConfigs.connectorId, connectorId)).limit(1)
  if (!adminCfg) return NextResponse.redirect(`${appUrl}/connectors?oauth_error=no_client_credentials`)

  const oauthCreds = JSON.parse(decrypt(adminCfg.encryptedConfig)) as { client_id: string; client_secret: string }
  const redirectUri = `${appUrl}/oauth/connector/callback`

  // Exchange code for tokens
  let tokenData: { access_token: string; refresh_token?: string; expires_in?: number; token_type?: string }
  try {
    const res = await fetch(manifest.auth.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        code,
        redirect_uri:  redirectUri,
        client_id:     oauthCreds.client_id,
        client_secret: oauthCreds.client_secret,
      }),
    })
    if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`)
    tokenData = await res.json() as typeof tokenData
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'token_exchange_failed'
    return NextResponse.redirect(`${appUrl}/connectors?oauth_error=${encodeURIComponent(msg)}`)
  }

  // Encrypt and store
  const configPayload = JSON.stringify({
    access_token:  tokenData.access_token,
    refresh_token: tokenData.refresh_token ?? null,
    expires_at:    tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : null,
    token_type:    tokenData.token_type ?? 'Bearer',
  })
  const encryptedConfig = encrypt(configPayload)
  const configHmac = computeConfigHmac(userId, connectorId, encryptedConfig)

  await db
    .insert(userConnectorConfigs)
    .values({ userId, connectorId, encryptedConfig, configHmac, enabled: true })
    .onConflictDoUpdate({
      target: [userConnectorConfigs.userId, userConnectorConfigs.connectorId],
      set: { encryptedConfig, configHmac, enabled: true, updatedAt: new Date() },
    })

  return NextResponse.redirect(`${appUrl}/connectors?oauth_connected=${encodeURIComponent(connector.name)}`)
}
