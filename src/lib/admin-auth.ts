import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { adminApiKeys } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { hashToken } from '@/lib/crypto'

export interface AdminContext {
  userId: string
  isApiKey: boolean
}

/**
 * Accepts admin identity from either:
 * 1. NextAuth session (UI usage)
 * 2. Bearer token starting with "mfk_" (CLI usage)
 *
 * Returns null if neither check passes.
 */
export async function requireAdmin(req?: Request): Promise<AdminContext | null> {
  // Try session first
  const session = await auth()
  if (session?.user?.id && session.user.role === 'admin') {
    return { userId: session.user.id, isApiKey: false }
  }

  // Try Bearer API key (CLI)
  if (req) {
    const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer mfk_')) {
      const token   = authHeader.slice(7)
      const keyHash = hashToken(token)
      const [row]   = await db
        .select({ id: adminApiKeys.id, createdBy: adminApiKeys.createdBy })
        .from(adminApiKeys)
        .where(eq(adminApiKeys.keyHash, keyHash))
        .limit(1)
      if (row) {
        void db.update(adminApiKeys).set({ lastUsedAt: new Date() }).where(eq(adminApiKeys.id, row.id))
        return { userId: row.createdBy, isApiKey: true }
      }
    }
  }

  return null
}
