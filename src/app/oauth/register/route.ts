/**
 * Dynamic Client Registration — RFC 7591
 *
 * Claude (and other MCP clients) call this endpoint to register themselves
 * automatically rather than requiring manual client setup in the admin UI.
 * We accept any registration request and return a client_id that echoes back
 * whatever the client sent (or generates one). No secrets are issued — we use
 * PKCE exclusively, so client_secret is never needed.
 *
 * This is a public endpoint (no auth required) — that is correct per RFC 7591
 * for open registration. The security comes from PKCE on every token request.
 */

import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

interface RegistrationRequest {
  client_name?:              string
  redirect_uris?:            string[]
  grant_types?:              string[]
  response_types?:           string[]
  token_endpoint_auth_method?: string
  scope?:                    string
  // Allow any additional fields clients may send
  [key: string]: unknown
}

export async function POST(req: NextRequest) {
  let body: RegistrationRequest = {}
  try {
    body = await req.json() as RegistrationRequest
  } catch {
    // Empty body is fine — we'll just generate defaults
  }

  // Generate a stable client_id derived from the client name if provided,
  // otherwise random. We don't store these — any client_id is accepted at
  // /oauth/authorize since we rely on PKCE for security.
  const clientId = body.client_name
    ? `mcp-${body.client_name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${randomBytes(4).toString('hex')}`
    : `mcp-client-${randomBytes(8).toString('hex')}`

  return NextResponse.json(
    {
      client_id:                   clientId,
      client_name:                 body.client_name ?? 'MCP Client',
      redirect_uris:               body.redirect_uris ?? [],
      grant_types:                 ['authorization_code'],
      response_types:              ['code'],
      token_endpoint_auth_method:  'none',
      scope:                       'mcp',
      // RFC 7591: include registration metadata
      client_id_issued_at:         Math.floor(Date.now() / 1000),
    },
    {
      status: 201,
      headers: CORS_HEADERS,
    },
  )
}
