import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { users, invitations, orgSettings } from '@/lib/db/schema'
import { eq, and, gt, isNull } from 'drizzle-orm'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== 'google') return false

      if (!user.email) return false

      const email = user.email
      const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN
      const domainOk = !!allowedDomain && email.endsWith(`@${allowedDomain}`)

      // Check additional allowed domains from org settings
      let orgDomainsOk = false
      if (!domainOk) {
        try {
          const [row] = await db.select().from(orgSettings).where(eq(orgSettings.key, 'allowed_domains')).limit(1)
          if (row) {
            const extraDomains = JSON.parse(row.value) as string[]
            orgDomainsOk = extraDomains.some(d => email.endsWith(`@${d}`))
          }
        } catch { /* ignore */ }
      }

      // Check invitation cookie
      let inviteOk = false
      if (!domainOk && !orgDomainsOk) {
        let cookieHeader: string | undefined
        try {
          const cookieStore = await cookies()
          cookieHeader = cookieStore.get('manifold_invite')?.value
        } catch { /* ignore — cookies() may not be available in all contexts */ }
        if (cookieHeader) {
          const [inv] = await db
            .select()
            .from(invitations)
            .where(
              and(
                eq(invitations.token, cookieHeader),
                eq(invitations.email, email),
                isNull(invitations.acceptedAt),
                gt(invitations.expiresAt, new Date()),
              )
            )
            .limit(1)
          if (inv) {
            inviteOk = true
            // Mark accepted
            await db.update(invitations).set({ acceptedAt: new Date() }).where(eq(invitations.id, inv.id))
          }
        }
      }

      if (!domainOk && !orgDomainsOk && !inviteOk) return false

      // Check if any users exist — first user becomes admin (bootstrap)
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .limit(1)

      const isFirstUser = !existing

      await db
        .insert(users)
        .values({
          email:     user.email,
          name:      user.name ?? user.email,
          avatarUrl: user.image ?? null,
          role:      isFirstUser ? 'admin' : 'member',
        })
        .onConflictDoUpdate({
          target: users.email,
          set: {
            name:      user.name ?? user.email,
            avatarUrl: user.image ?? null,
          },
        })

      return true
    },

    async session({ session }) {
      if (!session.user?.email) return session

      const [dbUser] = await db
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(eq(users.email, session.user.email))
        .limit(1)

      if (dbUser) {
        session.user.id = dbUser.id
        session.user.role = dbUser.role
      }

      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
})
