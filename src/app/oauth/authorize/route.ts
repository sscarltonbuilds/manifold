import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { generateOAuthCode } from '@/lib/oauth'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get('client_id')
  const redirectUri = searchParams.get('redirect_uri')
  const codeChallenge = searchParams.get('code_challenge')
  const codeChallengeMethod = searchParams.get('code_challenge_method') ?? 'S256'
  const state = searchParams.get('state')

  if (!clientId || !redirectUri || !codeChallenge) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'Missing required parameters' },
      { status: 400 }
    )
  }

  const session = await auth()
  if (!session?.user?.id) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', req.url)
    return NextResponse.redirect(loginUrl)
  }

  // Show consent page
  const consentUrl = new URL('/oauth/consent', req.url)
  consentUrl.searchParams.set('client_id', clientId)
  consentUrl.searchParams.set('redirect_uri', redirectUri)
  consentUrl.searchParams.set('code_challenge', codeChallenge)
  consentUrl.searchParams.set('code_challenge_method', codeChallengeMethod)
  if (state) consentUrl.searchParams.set('state', state)

  return NextResponse.redirect(consentUrl)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json() as {
    client_id: string
    redirect_uri: string
    code_challenge: string
    code_challenge_method: string
    state?: string
  }

  const code = generateOAuthCode(
    session.user.id,
    body.client_id,
    body.code_challenge,
    body.code_challenge_method,
    body.redirect_uri
  )

  const redirectUrl = new URL(body.redirect_uri)
  redirectUrl.searchParams.set('code', code)
  if (body.state) redirectUrl.searchParams.set('state', body.state)

  return NextResponse.json({ redirect: redirectUrl.toString() })
}
