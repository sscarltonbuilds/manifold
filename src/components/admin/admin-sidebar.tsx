'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Plug, Settings, ScrollText, Layers } from 'lucide-react'
import { LogoMark } from '@/components/shared/logo-mark'
import { UserMenu } from '@/components/shared/user-menu'
import { cn } from '@/lib/utils'

interface NavItem {
  href:  string
  label: string
  icon:  React.ComponentType<{ size?: number; strokeWidth?: number }>
  badge?: number
}

interface AdminSidebarProps {
  orgLogoUrl?:          string | null
  pendingRequestCount?: number
}

export function AdminSidebar({ orgLogoUrl, pendingRequestCount = 0 }: AdminSidebarProps) {
  const pathname = usePathname()

  const NAV_ITEMS: NavItem[] = [
    { href: '/admin',            label: 'Overview',   icon: LayoutDashboard },
    { href: '/admin/users',      label: 'Users',      icon: Users },
    { href: '/admin/connectors', label: 'Connectors', icon: Plug, badge: pendingRequestCount },
    { href: '/admin/bundles',    label: 'Bundles',    icon: Layers },
    { href: '/admin/settings',   label: 'Settings',   icon: Settings },
    { href: '/admin/audit',      label: 'Audit Log',  icon: ScrollText },
  ]

  return (
    <aside className="w-[220px] flex-none flex flex-col bg-[#0D0D0B] border-r border-[#2A2926] relative">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #2A2926 1px, transparent 0)',
          backgroundSize: '32px 32px',
          opacity: 0.6,
        }}
      />

      <div className="relative z-10 flex flex-col h-full">
        {/* Logo + admin badge */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-[#2A2926]">
          {orgLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={orgLogoUrl} alt="org logo" className="h-7 w-7 object-contain flex-none" />
          ) : (
            <LogoMark size={28} />
          )}
          <div>
            <span className="text-[#F0EFE9] uppercase tracking-[0.12em] font-bold text-sm block">
              MANIFOLD
            </span>
            <span className="text-[#C4853A] text-[10px] font-semibold uppercase tracking-[0.08em]">
              Admin
            </span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon, badge }) => {
            const isActive = href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150',
                  isActive
                    ? 'bg-[#2A2926] text-[#F0EFE9]'
                    : 'text-[#9C9890] hover:text-[#F0EFE9] hover:bg-[#1A1917]'
                )}
              >
                <Icon size={15} strokeWidth={1.75} />
                <span className="flex-1">{label}</span>
                {badge != null && badge > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C4853A] flex-none" />
                )}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-[#2A2926] p-3">
          <Link
            href="/connectors"
            className="block text-center text-xs text-[#9C9890] hover:text-[#F0EFE9] mb-2 transition-colors"
          >
            ← Back to app
          </Link>
          <UserMenu />
        </div>
      </div>
    </aside>
  )
}
