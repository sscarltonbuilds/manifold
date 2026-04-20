import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { connectors, userConnectorConfigs, auditLogs } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { encrypt, decrypt, computeConfigHmac, verifyConfigHmac } from '@/lib/crypto'
import { getAuthFields } from '@/lib/manifest'
import type { Manifest } from '@/lib/manifest'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: 'unauthorized' } }, { status: 401 })
  }

  const { id } = await params
  const [connector] = await db.select().from(connectors).where(eq(connectors.id, id)).limit(1)
  if (!connector) return NextResponse.json({ error: { code: 'not_found' } }, { status: 404 })

  const [row] = await db
    .select()
    .from(userConnectorConfigs)
    .where(and(eq(userConnectorConfigs.userId, session.user.id), eq(userConnectorConfigs.connectorId, id)))
    .limit(1)

  if (!row) return NextResponse.json({ configured: false })

  if (row.configHmac) {
    const valid = verifyConfigHmac(session.user.id, id, row.encryptedConfig, row.configHmac)
    if (!valid) {
      return NextResponse.json({ error: { code: 'integrity_error', message: 'Credential integrity check failed' } }, { status: 500 })
    }
  }

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
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: 'unauthorized' } }, { status: 401 })
  }

  const { id } = await params
  const [connector] = await db.select().from(connectors).where(eq(connectors.id, id)).limit(1)
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
  const configHmac = computeConfigHmac(session.user.id, id, encryptedConfig)
  const keyVersion = process.env.ENCRYPTION_KEY_VERSION ?? '1'

  await db
    .insert(userConnectorConfigs)
    .values({
      userId:               session.user.id,
      connectorId:          id,
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
    actorId:      session.user.id,
    targetUserId: session.user.id,
    connectorId:  id,
    action:       'config.updated',
    detail:       { connectorId: id },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: 'unauthorized' } }, { status: 401 })
  }

  const { id } = await params

  await db
    .delete(userConnectorConfigs)
    .where(and(eq(userConnectorConfigs.userId, session.user.id), eq(userConnectorConfigs.connectorId, id)))

  await db.insert(auditLogs).values({
    actorId:      session.user.id,
    targetUserId: session.user.id,
    connectorId:  id,
    action:       'config.removed',
    detail:       { connectorId: id },
  })

  return NextResponse.json({ ok: true })
}
