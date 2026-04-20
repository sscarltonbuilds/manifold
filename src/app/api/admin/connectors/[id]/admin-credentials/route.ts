import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { db } from '@/lib/db'
import { connectors, connectorAdminConfigs, auditLogs } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { encrypt, computeConfigHmac } from '@/lib/crypto'
import { z } from 'zod'
import type { Manifest } from '@/lib/manifest'

type RouteParams = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: { code: 'forbidden' } }, { status: 403 })

  const { id } = await params
  const [connector] = await db.select().from(connectors).where(eq(connectors.id, id)).limit(1)
  if (!connector) return NextResponse.json({ error: { code: 'not_found' } }, { status: 404 })

  const manifest = connector.manifest as Manifest
  const authType = manifest.auth.type

  let body: Record<string, string>

  if (authType === 'oauth2') {
    // For oauth2, only client_id and client_secret
    const schema = z.object({
      client_id:     z.string().min(1),
      client_secret: z.string().min(1),
    })
    const parsed = schema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: { code: 'validation_error', message: parsed.error.message } }, { status: 400 })
    }
    body = parsed.data
  } else if (authType === 'api_key' || authType === 'bearer_token') {
    if (manifest.auth.type !== 'api_key' && manifest.auth.type !== 'bearer_token') {
      return NextResponse.json({ error: { code: 'invalid_auth_type' } }, { status: 400 })
    }
    const fields = manifest.auth.fields
    const shape = Object.fromEntries(fields.map(f => [f.key, f.required ? z.string().min(1) : z.string()]))
    const schema = z.object(shape)
    const parsed = schema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: { code: 'validation_error', message: parsed.error.message } }, { status: 400 })
    }
    body = parsed.data
  } else {
    return NextResponse.json({ error: { code: 'invalid_auth_type' } }, { status: 400 })
  }

  const encryptedConfig = encrypt(JSON.stringify(body))
  const configHmac = computeConfigHmac(`admin:${id}`, id, encryptedConfig)

  // Upsert: update if exists, insert if not
  const [existing] = await db
    .select({ id: connectorAdminConfigs.id })
    .from(connectorAdminConfigs)
    .where(eq(connectorAdminConfigs.connectorId, id))
    .limit(1)

  if (existing) {
    await db
      .update(connectorAdminConfigs)
      .set({ encryptedConfig, configHmac, updatedAt: new Date() })
      .where(eq(connectorAdminConfigs.connectorId, id))
  } else {
    await db.insert(connectorAdminConfigs).values({ connectorId: id, encryptedConfig, configHmac })
  }

  await db.insert(auditLogs).values({
    actorId:     admin.userId,
    connectorId: id,
    action:      'connector.admin_credentials_updated',
    detail:      { authType },
  })

  return NextResponse.json({ ok: true })
}
