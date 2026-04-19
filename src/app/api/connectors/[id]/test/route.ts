import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { connectors } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { connectAndDiscover } from '@/lib/mcp/discovery'
import { getAuthFields } from '@/lib/manifest'
import type { Manifest, Injection } from '@/lib/manifest'

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: 'unauthorized' } }, { status: 401 })
  }

  const { id } = await params
  const [connector] = await db.select().from(connectors).where(eq(connectors.id, id)).limit(1)
  if (!connector) return NextResponse.json({ error: { code: 'not_found' } }, { status: 404 })

  const body = await req.json() as Record<string, string>
  const manifest = connector.manifest as Manifest
  const fields = getAuthFields(manifest)

  // Build headers from injected credentials provided in request body
  const headers: Record<string, string> = {}
  for (const field of fields) {
    if (!field.injection) continue
    const value = body[field.key]
    if (!value) continue
    const injection = field.injection as Injection
    if (injection.method === 'header') {
      headers[injection.name] = value
    } else if (injection.method === 'bearer') {
      headers['Authorization'] = `Bearer ${value}`
    }
  }

  try {
    const tools = await connectAndDiscover(connector.endpoint, headers)
    return NextResponse.json({ ok: true, message: `Connected — ${tools.length} tool${tools.length === 1 ? '' : 's'} available` })
  } catch (err) {
    return NextResponse.json({
      ok: false,
      message: err instanceof Error ? err.message : 'Connection test failed',
    })
  }
}
