import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { db } from '@/lib/db'
import { adminApiKeys } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: { code: 'forbidden' } }, { status: 403 })

  const { id } = await params
  await db.delete(adminApiKeys).where(eq(adminApiKeys.id, id))
  return NextResponse.json({ ok: true })
}
