import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { oauthClients } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { generateToken, hashToken } from '@/lib/crypto'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: { code: 'forbidden' } }, { status: 403 })
  }

  const rows = await db
    .select({ clientId: oauthClients.clientId, createdAt: oauthClients.createdAt })
    .from(oauthClients)
    .orderBy(oauthClients.createdAt)

  return NextResponse.json(rows)
}

export async function POST() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: { code: 'forbidden' } }, { status: 403 })
  }

  const clientId = `mf_${generateToken().slice(0, 24)}`
  const clientSecret = generateToken()
  const secretHash = hashToken(clientSecret)

  await db.insert(oauthClients).values({ clientId, secretHash })

  return NextResponse.json({ clientId, clientSecret })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: { code: 'forbidden' } }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get('clientId')
  if (!clientId) {
    return NextResponse.json({ error: { code: 'invalid_request' } }, { status: 400 })
  }

  await db.delete(oauthClients).where(eq(oauthClients.clientId, clientId))
  return NextResponse.json({ ok: true })
}
