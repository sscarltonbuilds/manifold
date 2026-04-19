'use client'

import { useSession, signOut } from 'next-auth/react'
import { LogOut, Settings } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export function UserMenu() {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)

  if (!session?.user) return null

  const initials = session.user.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '??'

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#1A1917] transition-colors duration-150"
      >
        {session.user.image ? (
          <img
            src={session.user.image}
            alt={session.user.name ?? ''}
            className="w-7 h-7 rounded-full flex-none"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-[#C4853A] flex items-center justify-center flex-none">
            <span className="text-[#1A1917] text-xs font-bold">{initials}</span>
          </div>
        )}
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[#F0EFE9] text-xs font-medium truncate">{session.user.name}</p>
          <p className="text-[#9C9890] text-xs truncate">{session.user.email}</p>
        </div>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 right-0 mb-1 z-20 bg-[#1A1917] border border-[#2A2926] rounded-lg overflow-hidden shadow-lg">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-[#9C9890] hover:text-[#F0EFE9] hover:bg-[#2A2926] transition-colors"
            >
              <Settings size={14} />
              Settings
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#9C9890] hover:text-[#F0EFE9] hover:bg-[#2A2926] transition-colors"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  )
}
