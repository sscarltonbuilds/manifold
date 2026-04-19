import { db } from '@/lib/db'
import { oauthTokens } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { hashToken, generateToken } from '@/lib/crypto'
import { createHash, randomBytes, timingSafeEqual } from 'crypto'

// In-memory store for short-lived auth codes (10 min TTL)
// In production consider using Redis or the DB
const authCodes = new Map<
  string,
  {
    userId: string
    clientId: string
    codeChallenge: string
    codeChallengeMethod: string
    redirectUri: string
    expiresAt: number
  }
>()

export function generateOAuthCode(
  userId: string,
  clientId: string,
  codeChallenge: string,
  codeChallengeMethod: string,
  redirectUri: string
): string {
  const code = randomBytes(32).toString('hex')
  authCodes.set(code, {
    userId,
    clientId,
    codeChallenge,
    codeChallengeMethod,
    redirectUri,
    expiresAt: Date.now() + 10 * 60 * 1000,
  })
  return code
}

function verifyPkce(
  codeVerifier: string,
  codeChallenge: string,
  method: string
): boolean {
  if (method === 'S256') {
    const hash = createHash('sha256').update(codeVerifier).digest('base64url')
    return timingSafeEqual(Buffer.from(hash), Buffer.from(codeChallenge))
  }
  // plain method
  return timingSafeEqual(Buffer.from(codeVerifier), Buffer.from(codeChallenge))
}

export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string,
  clientId: string
): Promise<string> {
  const stored = authCodes.get(code)

  if (!stored) throw new Error('Invalid or expired authorization code')
  if (stored.expiresAt < Date.now()) {
    authCodes.delete(code)
    throw new Error('Authorization code expired')
  }
  if (stored.clientId !== clientId) throw new Error('Client ID mismatch')
  if (!verifyPkce(codeVerifier, stored.codeChallenge, stored.codeChallengeMethod)) {
    throw new Error('PKCE verification failed')
  }

  authCodes.delete(code)

  const token = generateToken()
  const tokenHash = hashToken(token)

  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days

  await db.insert(oauthTokens).values({
    userId: stored.userId,
    tokenHash,
    clientId,
    expiresAt,
  })

  return token
}

export async function revokeToken(tokenHash: string): Promise<void> {
  await db.delete(oauthTokens).where(eq(oauthTokens.tokenHash, tokenHash))
}
