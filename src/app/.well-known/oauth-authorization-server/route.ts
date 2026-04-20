import { NextResponse } from 'next/server'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET() {
  // Use NEXT_PUBLIC_APP_URL as the canonical public base URL.
  // NEXTAUTH_URL may be set to an internal address behind a proxy.
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '')

  return NextResponse.json(
    {
      issuer:                                baseUrl,
      authorization_endpoint:               `${baseUrl}/oauth/authorize`,
      token_endpoint:                        `${baseUrl}/oauth/token`,
      registration_endpoint:                 `${baseUrl}/oauth/register`,
      response_types_supported:             ['code'],
      grant_types_supported:                ['authorization_code'],
      code_challenge_methods_supported:     ['S256'],
      token_endpoint_auth_methods_supported: ['none'],
      scopes_supported:                     ['mcp'],
    },
    { headers: CORS_HEADERS },
  )
}
