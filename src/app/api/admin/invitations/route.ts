import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { invitations, auditLogs } from '@/lib/db/schema'
import { isNull } from 'drizzle-orm'
import { generateToken } from '@/lib/crypto'
import { z } from 'zod'

const PostSchema = z.object({
  email: z.string().email(),
  role:  z.enum(['member', 'admin']).default('member'),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: { code: 'forbidden' } }, { status: 403 })
  }
  const pending = await db
    .select()
    .from(invitations)
    .where(isNull(invitations.acceptedAt))
  return NextResponse.json(pending)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: { code: 'forbidden' } }, { status: 403 })
  }
  const parsed = PostSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'validation_error', message: parsed.error.message } }, { status: 400 })
  }
  const { email, role } = parsed.data
  const token = generateToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  const [inv] = await db.insert(invitations).values({
    email,
    role,
    token,
    expiresAt,
    invitedBy: session.user.id,
  }).returning()

  await db.insert(auditLogs).values({
    actorId: session.user.id,
    action: 'user.invited',
    detail: { email, role },
  })

  const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/invitations/accept/${token}`
  return NextResponse.json({ ok: true, id: inv.id, acceptUrl })
}
