import { SessionProvider } from 'next-auth/react'
import { auth } from '@/lib/auth'
import { Sidebar } from '@/components/shared/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { orgSettings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  const [logoRow] = await db
    .select({ value: orgSettings.value })
    .from(orgSettings)
    .where(eq(orgSettings.key, 'org_logo_url'))
    .limit(1)

  return (
    <SessionProvider session={session}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          isAdmin={session.user.role === 'admin'}
          orgLogoUrl={logoRow?.value ?? null}
        />
        <main className="flex-1 overflow-y-auto bg-[#F5F4F0]">
          {children}
        </main>
      </div>
      <Toaster position="bottom-right" />
    </SessionProvider>
  )
}
