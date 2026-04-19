import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { connectors, userConnectorConfigs, auditLogs } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { encrypt, decrypt } from '@/lib/crypto'
import { getAuthFields } from '@/lib/manifest'
import type { Manifest } from '@/lib/manifest'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string; connectorId: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: { code: 'forbidden' } }, { status: 403 })
  }

  const { id: userId, connectorId } = await params
  const [connector] = await db.select().from(connectors).where(eq(connectors.id, connectorId)).limit(1)
  if (!connector) return NextResponse.json({ error: { code: 'not_found' } }, { status: 404 })

  const [row] = await db
    .select()
    .from(userConnectorConfigs)
    .where(and(eq(userConnectorConfigs.userId, userId), eq(userConnectorConfigs.connectorId, connectorId)))
    .limit(1)

  if (!row) return NextResponse.json({ configured: false })

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
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: { code: 'forbidden' } }, { status: 403 })
  }

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
  const keyVersion = process.env.ENCRYPTION_KEY_VERSION ?? '1'

  await db
    .insert(userConnectorConfigs)
    .values({
      userId,
      connectorId,
      encryptedConfig,
      encryptionKeyVersion: keyVersion,
      enabled:              true,
    })
    .onConflictDoUpdate({
      target: [userConnectorConfigs.userId, userConnectorConfigs.connectorId],
      set:    { encryptedConfig, encryptionKeyVersion: keyVersion, enabled: true, updatedAt: new Date() },
    })

  await db.insert(auditLogs).values({
    actorId:      session.user.id,
    targetUserId: userId,
    connectorId,
    action:       'config.updated_by_admin',
    detail:       { connectorId, onBehalfOf: userId },
  })

  return NextResponse.json({ ok: true })
}
