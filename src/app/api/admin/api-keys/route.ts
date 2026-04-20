import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { db } from '@/lib/db'
import { adminApiKeys } from '@/lib/db/schema'
import { generateToken, hashToken } from '@/lib/crypto'
import { z } from 'zod'

export async function GET(req: Request) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: { code: 'forbidden' } }, { status: 403 })

  const rows = await db
    .select({ id: adminApiKeys.id, name: adminApiKeys.name, createdAt: adminApiKeys.createdAt, lastUsedAt: adminApiKeys.lastUsedAt })
    .from(adminApiKeys)
    .orderBy(adminApiKeys.createdAt)

  return NextResponse.json({ keys: rows })
}

const CreateSchema = z.object({ name: z.string().min(1).max(100) })

export async function POST(req: Request) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: { code: 'forbidden' } }, { status: 403 })

  const body = CreateSchema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: { code: 'invalid_request' } }, { status: 400 })

  const plainKey = `mfk_${generateToken()}`
  const keyHash  = hashToken(plainKey)

  const [row] = await db
    .insert(adminApiKeys)
    .values({ name: body.data.name, keyHash, createdBy: admin.userId })
    .returning({ id: adminApiKeys.id })

  return NextResponse.json({ id: row!.id, name: body.data.name, key: plainKey })
}
