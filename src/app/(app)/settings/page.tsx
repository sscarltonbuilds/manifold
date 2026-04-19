import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { signOut } from '@/lib/auth'

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div className="p-8 max-w-lg">
      <div className="mb-8">
        <h1 className="text-[#1A1917] text-2xl font-medium tracking-tight">Settings</h1>
      </div>

      <div className="bg-white border border-[#E3E1DC] rounded-[10px] p-6 flex flex-col gap-5">
        <div>
          <label className="text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em]">
            Name
          </label>
          <p className="text-[#1A1917] text-sm mt-1">{session.user.name}</p>
        </div>

        <div>
          <label className="text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em]">
            Email
          </label>
          <p className="text-[#1A1917] text-sm mt-1">{session.user.email}</p>
        </div>

        <div className="pt-2 border-t border-[#E3E1DC]">
          <form
            action={async () => {
              'use server'
              await signOut({ redirectTo: '/login' })
            }}
          >
            <button
              type="submit"
              className="text-sm text-[#A3352B] hover:underline"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
