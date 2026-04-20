import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForToken } from '@/lib/oauth'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  if (!await rateLimit(`oauth:${ip}`, 20, 60_000)) {
    return NextResponse.json(
      { error: 'slow_down' },
      { status: 429, headers: { 'Retry-After': '60' } }
    )
  }

  let params: URLSearchParams | null = null

  const contentType = req.headers.get('content-type') ?? ''
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await req.text()
    params = new URLSearchParams(text)
  } else {
    const body = await req.json() as Record<string, string>
    params = new URLSearchParams(body)
  }

  const grantType = params.get('grant_type')
  const code = params.get('code')
  const codeVerifier = params.get('code_verifier')
  const clientId = params.get('client_id')

  if (grantType !== 'authorization_code') {
    return NextResponse.json({ error: 'unsupported_grant_type' }, { status: 400 })
  }

  if (!code || !codeVerifier || !clientId) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'Missing required parameters' },
      { status: 400 }
    )
  }

  try {
    const accessToken = await exchangeCodeForToken(code, codeVerifier, clientId)
    return NextResponse.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 90 * 24 * 60 * 60,
    })
  } catch (err) {
    return NextResponse.json(
      {
        error: 'invalid_grant',
        error_description: err instanceof Error ? err.message : 'Token exchange failed',
      },
      { status: 400 }
    )
  }
}
