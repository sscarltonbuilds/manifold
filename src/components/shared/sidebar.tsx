'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Plug, Settings, ShieldCheck, Copy, Check } from 'lucide-react'
import { LogoMark } from './logo-mark'
import { UserMenu } from './user-menu'
import { cn } from '@/lib/utils'
import { useState } from 'react'

const NAV_ITEMS = [
  { href: '/connectors', label: 'Connectors', icon: Plug },
  { href: '/settings', label: 'Settings', icon: Settings },
]

interface SidebarProps {
  isAdmin?: boolean
  orgLogoUrl?: string | null
}

export function Sidebar({ isAdmin, orgLogoUrl }: SidebarProps) {
  const pathname = usePathname()
  const [copied, setCopied] = useState(false)

  const mcpUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '') + '/mcp'

  const copyMcpUrl = async () => {
    await navigator.clipboard.writeText(mcpUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <aside className="w-[220px] flex-none flex flex-col bg-[#0D0D0B] border-r border-[#2A2926] relative">
      {/* Dot grid texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #2A2926 1px, transparent 0)',
          backgroundSize: '32px 32px',
          opacity: 0.6,
        }}
      />

      <div className="relative z-10 flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-[#2A2926]">
          {orgLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={orgLogoUrl} alt="org logo" className="h-7 w-7 object-contain flex-none" />
          ) : (
            <LogoMark size={28} />
          )}
          <span className="text-[#F0EFE9] uppercase tracking-[0.12em] font-bold text-sm">
            MANIFOLD
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href)
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
                {label}
              </Link>
            )
          })}
        </nav>

        {/* MCP URL shortcut */}
        <div className="px-3 pb-3">
          <div className="bg-[#1A1917] border border-[#2A2926] rounded-[8px] px-3 py-2.5">
            <p className="text-[#6B6966] text-[10px] font-semibold uppercase tracking-[0.08em] mb-1.5">
              MCP endpoint
            </p>
            <div className="flex items-center gap-2">
              <code className="text-[#C4853A] font-mono text-[10px] flex-1 truncate">/mcp</code>
              <button
                onClick={copyMcpUrl}
                title={`Copy: ${mcpUrl}`}
                className="text-[#9C9890] hover:text-[#C4853A] transition-colors flex-none"
              >
                {copied
                  ? <Check size={12} className="text-[#4A7C59]" />
                  : <Copy size={12} />
                }
              </button>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-[#2A2926] p-3 flex flex-col gap-1">
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#C4853A] hover:bg-[#1A1917] transition-colors duration-150 font-medium"
            >
              <ShieldCheck size={13} strokeWidth={1.75} />
              Admin panel
            </Link>
          )}
          <UserMenu />
        </div>
      </div>
    </aside>
  )
}
