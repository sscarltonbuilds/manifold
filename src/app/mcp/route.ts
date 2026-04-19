import { NextRequest, NextResponse } from 'next/server'
import { resolveUser, handleJsonRpc } from '@/lib/mcp/proxy'
import { rateLimit } from '@/lib/rate-limit'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { JsonRpcRequest } from '@/lib/mcp/types'

async function updateLastActive(userId: string) {
  await db.update(users).set({ lastActiveAt: new Date() }).where(eq(users.id, userId))
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  const user = await resolveUser(authHeader)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!rateLimit(`mcp:${user.id}`)) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': '60' } }
    )
  }

  void updateLastActive(user.id)

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      send({ type: 'connected', userId: user.id })

      const timeout = setTimeout(() => {
        controller.close()
      }, 60_000)

      req.signal.addEventListener('abort', () => {
        clearTimeout(timeout)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  const user = await resolveUser(authHeader)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!rateLimit(`mcp:${user.id}`)) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': '60' } }
    )
  }

  void updateLastActive(user.id)

  let body: JsonRpcRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } },
      { status: 400 }
    )
  }

  const response = await handleJsonRpc(body, user.id)
  return NextResponse.json(response)
}
