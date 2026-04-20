import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { oauthTokens } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: 'unauthorized' } }, { status: 401 })
  }

  const { id } = await params

  const [row] = await db
    .select({ id: oauthTokens.id })
    .from(oauthTokens)
    .where(and(eq(oauthTokens.id, id), eq(oauthTokens.userId, session.user.id)))
    .limit(1)

  if (!row) {
    return NextResponse.json({ error: { code: 'not_found' } }, { status: 404 })
  }

  await db.delete(oauthTokens).where(eq(oauthTokens.id, id))

  return NextResponse.json({ ok: true })
}

const PatchSchema = z.object({
  name: z.string().max(100),
})

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: 'unauthorized' } }, { status: 401 })
  }

  const { id } = await params

  const [row] = await db
    .select({ id: oauthTokens.id })
    .from(oauthTokens)
    .where(and(eq(oauthTokens.id, id), eq(oauthTokens.userId, session.user.id)))
    .limit(1)

  if (!row) {
    return NextResponse.json({ error: { code: 'not_found' } }, { status: 404 })
  }

  const parsed = PatchSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'validation_error', message: parsed.error.message } }, { status: 400 })
  }

  await db.update(oauthTokens).set({ name: parsed.data.name }).where(eq(oauthTokens.id, id))

  return NextResponse.json({ ok: true })
}
