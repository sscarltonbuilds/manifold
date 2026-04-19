import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

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

      const allowedEmails = process.env.ALLOWED_EMAILS?.split(',').map(e => e.trim())
      const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN

      const emailAllowed =
        (allowedEmails && allowedEmails.includes(user.email)) ||
        (allowedDomain && user.email.endsWith(`@${allowedDomain}`))

      if (!emailAllowed) return false

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
