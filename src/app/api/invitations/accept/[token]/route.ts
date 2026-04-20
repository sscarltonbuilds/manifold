import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { invitations } from '@/lib/db/schema'
import { eq, and, isNull, gt } from 'drizzle-orm'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const [inv] = await db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.token, token),
        isNull(invitations.acceptedAt),
        gt(invitations.expiresAt, new Date()),
      )
    )
    .limit(1)

  if (!inv) {
    // Redirect to login with error
    return NextResponse.redirect(new URL('/login?error=invalid_invite', process.env.NEXT_PUBLIC_APP_URL!))
  }

  // Set a short-lived cookie with the invite token so auth.ts can read it on sign-in
  const response = NextResponse.redirect(new URL('/login?invited=1', process.env.NEXT_PUBLIC_APP_URL!))
  response.cookies.set('manifold_invite', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes — enough time to sign in
    path: '/',
  })
  return response
}
