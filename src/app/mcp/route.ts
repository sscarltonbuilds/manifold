import { NextRequest, NextResponse } from 'next/server'
import { resolveUser, handleJsonRpc } from '@/lib/mcp/proxy'
import { rateLimit } from '@/lib/rate-limit'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { JsonRpcRequest } from '@/lib/mcp/types'

// SSE connections close after 5 minutes. Clients automatically reconnect and
// re-initialise — this is correct MCP behaviour. Tool calls are HTTP POST and
// are unaffected by SSE lifecycle.
const SSE_TIMEOUT_MS      = 5 * 60_000   // 5 minutes
const KEEPALIVE_INTERVAL_MS = 30_000     // 30-second ping to keep the connection alive through proxies

async function updateLastActive(userId: string) {
  await db.update(users).set({ lastActiveAt: new Date() }).where(eq(users.id, userId))
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  const user = await resolveUser(authHeader)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!await rateLimit(`mcp:${user.id}`)) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': '60' } },
    )
  }

  void updateLastActive(user.id)

  // Acknowledge Last-Event-ID for reconnecting clients (we don't replay events,
  // but logging the header helps with debugging reconnection behaviour)
  const lastEventId = req.headers.get('last-event-id')
  void lastEventId  // used for future resumption; suppress unused-var lint

  const encoder = new TextEncoder()
  let sseTimeout:    ReturnType<typeof setTimeout>   | null = null
  let keepaliveTimer: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) => {
        try { controller.enqueue(encoder.encode(data)) } catch { /* stream closed */ }
      }

      // Initial connected event
      send(`data: ${JSON.stringify({ type: 'connected', userId: user.id })}\n\n`)

      // Keepalive pings — SSE comments (`: …`) are ignored by clients but
      // prevent proxy/load-balancer idle timeouts
      keepaliveTimer = setInterval(() => {
        send(': keepalive\n\n')
      }, KEEPALIVE_INTERVAL_MS)

      // Close after SSE_TIMEOUT_MS; clients reconnect automatically
      sseTimeout = setTimeout(() => {
        if (keepaliveTimer) clearInterval(keepaliveTimer)
        controller.close()
      }, SSE_TIMEOUT_MS)

      // Clean up if the client disconnects first
      req.signal.addEventListener('abort', () => {
        if (sseTimeout)    clearTimeout(sseTimeout)
        if (keepaliveTimer) clearInterval(keepaliveTimer)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache, no-store',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no',   // disable Nginx buffering
    },
  })
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  const user = await resolveUser(authHeader)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!await rateLimit(`mcp:${user.id}`)) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': '60' } },
    )
  }

  void updateLastActive(user.id)

  let body: JsonRpcRequest
  try {
    body = await req.json() as JsonRpcRequest
  } catch {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } },
      { status: 400 },
    )
  }

  const response = await handleJsonRpc(body, user.id)
  return NextResponse.json(response)
}
