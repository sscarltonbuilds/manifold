import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { db } from '@/lib/db'
import { connectors, userConnectorConfigs, auditLogs } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { encrypt, decrypt, computeConfigHmac, verifyConfigHmac } from '@/lib/crypto'
import { getAuthFields } from '@/lib/manifest'
import type { Manifest } from '@/lib/manifest'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string; connectorId: string }> }

export async function GET(req: NextRequest, { params }: RouteParams) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: { code: 'forbidden' } }, { status: 403 })

  const { id: userId, connectorId } = await params
  const [connector] = await db.select().from(connectors).where(eq(connectors.id, connectorId)).limit(1)
  if (!connector) return NextResponse.json({ error: { code: 'not_found' } }, { status: 404 })

  const [row] = await db
    .select()
    .from(userConnectorConfigs)
    .where(and(eq(userConnectorConfigs.userId, userId), eq(userConnectorConfigs.connectorId, connectorId)))
    .limit(1)

  if (!row) return NextResponse.json({ configured: false })

  if (row.configHmac) {
    const valid = verifyConfigHmac(userId, connectorId, row.encryptedConfig, row.configHmac)
    if (!valid) {
      return NextResponse.json({ error: { code: 'integrity_error', message: 'Credential integrity check failed' } }, { status: 500 })
    }
  }
  // Log admin access to user credentials
  await db.insert(auditLogs).values({
    actorId:      admin.userId,
    targetUserId: userId,
    connectorId,
    action:       'config.accessed_by_admin',
    detail:       { connectorId, onBehalfOf: userId },
  })

  const decrypted = JSON.parse(decrypt(row.encryptedConfig)) as Record<string, string>
  const fields = getAuthFields(connector.manifest as Manifest)
  const masked: Record<string, string> = {}
  for (const field of fields) {
    if (field.key in decrypted) {
      masked[field.key] = field.secret ? '••••••••' : decrypted[field.key]
    }
  }

  return NextResponse.json({ configured: true, enabled: row.enabled, config: masked })
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: { code: 'forbidden' } }, { status: 403 })

  const { id: userId, connectorId } = await params
  const [connector] = await db.select().from(connectors).where(eq(connectors.id, connectorId)).limit(1)
  if (!connector) return NextResponse.json({ error: { code: 'not_found' } }, { status: 404 })

  const fields = getAuthFields(connector.manifest as Manifest)
  const shape = Object.fromEntries(fields.map(f => [f.key, f.required ? z.string().min(1) : z.string()]))
  const configSchema = z.object(shape)

  const body = await req.json() as Record<string, string>
  const parsed = configSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'validation_error', message: parsed.error.message } },
      { status: 400 }
    )
  }

  const encryptedConfig = encrypt(JSON.stringify(parsed.data))
  const configHmac = computeConfigHmac(userId, connectorId, encryptedConfig)
  const keyVersion = process.env.ENCRYPTION_KEY_VERSION ?? '1'

  await db
    .insert(userConnectorConfigs)
    .values({
      userId,
      connectorId,
      encryptedConfig,
      encryptionKeyVersion: keyVersion,
      configHmac,
      enabled:              true,
    })
    .onConflictDoUpdate({
      target: [userConnectorConfigs.userId, userConnectorConfigs.connectorId],
      set:    { encryptedConfig, encryptionKeyVersion: keyVersion, configHmac, enabled: true, updatedAt: new Date() },
    })

  await db.insert(auditLogs).values({
    actorId:      admin.userId,
    targetUserId: userId,
    connectorId,
    action:       'config.updated_by_admin',
    detail:       { connectorId, onBehalfOf: userId },
  })

  return NextResponse.json({ ok: true })
}
