import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { SessionProvider } from 'next-auth/react'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { Toaster } from '@/components/ui/sonner'
import { db } from '@/lib/db'
import { orgSettings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role !== 'admin') redirect('/connectors')

  const [logoRow] = await db
    .select({ value: orgSettings.value })
    .from(orgSettings)
    .where(eq(orgSettings.key, 'org_logo_url'))
    .limit(1)

  return (
    <SessionProvider session={session}>
      <div className="flex h-screen overflow-hidden">
        <AdminSidebar orgLogoUrl={logoRow?.value ?? null} />
        <main className="flex-1 overflow-y-auto bg-[#F5F4F0]">
          {children}
        </main>
      </div>
      <Toaster position="bottom-right" />
    </SessionProvider>
  )
}
