import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { nextUrl, auth: session } = req
  const isLoggedIn = !!session?.user
  const isAdmin    = session?.user?.role === 'admin'

  const path = nextUrl.pathname

  const isAuthRoute    = path.startsWith('/login')
  const isAdminRoute   = path.startsWith('/admin')
  const isOnboarding   = path.startsWith('/onboarding')
  const isPublicRoute  =
    path === '/' ||
    path.startsWith('/api') ||
    path.startsWith('/oauth') ||
    path.startsWith('/mcp') ||
    path.startsWith('/.well-known')
  const isAppRoute     = !isAuthRoute && !isAdminRoute && !isOnboarding && !isPublicRoute

  if (isAuthRoute) {
    if (isLoggedIn) return NextResponse.redirect(new URL('/connectors', nextUrl))
    return NextResponse.next()
  }

  if (isOnboarding) {
    if (!isLoggedIn) return NextResponse.redirect(new URL('/login', nextUrl))
    if (!isAdmin)    return NextResponse.redirect(new URL('/connectors', nextUrl))
    return NextResponse.next()
  }

  if (isAdminRoute) {
    if (!isLoggedIn) return NextResponse.redirect(new URL('/login', nextUrl))
    if (!isAdmin)    return NextResponse.redirect(new URL('/connectors', nextUrl))
    return NextResponse.next()
  }

  if (isAppRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
