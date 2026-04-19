import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminSettingsClient } from '@/components/admin/admin-settings-client'
import { OrgBrandingClient } from '@/components/admin/org-branding-client'
import { CopyButton } from '@/components/shared/copy-button'
import { db } from '@/lib/db'
import { orgSettings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export default async function AdminSettingsPage() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') redirect('/connectors')

  const mcpUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/mcp`

  const [logoRow] = await db
    .select({ value: orgSettings.value })
    .from(orgSettings)
    .where(eq(orgSettings.key, 'org_logo_url'))
    .limit(1)

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-[#1A1917] text-2xl font-medium tracking-tight">Settings</h1>
      </div>

      {/* MCP Server URL */}
      <section className="mb-8">
        <h2 className="text-[#1A1917] text-sm font-semibold uppercase tracking-[0.08em] mb-3">
          MCP Server URL
        </h2>
        <div className="bg-white border border-[#E3E1DC] rounded-[10px] p-5">
          <p className="text-[#6B6966] text-sm mb-3">
            Add this as a remote connector in your AI tool&apos;s organisation settings.
          </p>
          <div className="flex items-center gap-3 bg-[#1A1917] rounded-[6px] px-3 py-2.5">
            <code className="text-[#C4853A] font-mono text-sm flex-1 break-all">{mcpUrl}</code>
            <CopyButton text={mcpUrl} />
          </div>
        </div>
      </section>

      {/* Organisation branding */}
      <section className="mb-8">
        <h2 className="text-[#1A1917] text-sm font-semibold uppercase tracking-[0.08em] mb-1">
          Organisation logo
        </h2>
        <p className="text-[#9C9890] text-xs mb-3">
          Replaces the Manifold mark in the sidebar for all users.
        </p>
        <OrgBrandingClient currentLogoUrl={logoRow?.value ?? null} />
      </section>

      {/* OAuth Credentials */}
      <section>
        <h2 className="text-[#1A1917] text-sm font-semibold uppercase tracking-[0.08em] mb-3">
          OAuth Credentials
        </h2>
        <AdminSettingsClient />
      </section>
    </div>
  )
}
