import Link from 'next/link'
import { LogoMark } from '@/components/shared/logo-mark'
import { Server, Key, Users } from 'lucide-react'

const HOW_IT_WORKS = [
  {
    icon: Server,
    step: '01',
    title: 'Deploy Manifold',
    body: 'Self-host on any server. Docker Compose, one config file, running in minutes.',
  },
  {
    icon: Key,
    step: '02',
    title: 'Add your connectors',
    body: 'Paste a manifest URL. Manifold fetches the spec, validates it, and discovers tools automatically.',
  },
  {
    icon: Users,
    step: '03',
    title: 'Your team connects',
    body: 'One MCP URL. Users sign in and toggle connectors on. Or assign a bundle to provision the right set of tools for their role automatically.',
  },
]

export default function HomePage() {
  return (
    <div
      className="min-h-screen bg-[#0D0D0B] text-[#F0EFE9] flex flex-col"
      style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, #2A2926 1px, transparent 0)',
        backgroundSize: '32px 32px',
      }}
    >
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <LogoMark size={28} />
          <span className="text-[#F0EFE9] text-sm font-bold tracking-[0.12em] uppercase">Manifold</span>
        </div>
        <div className="flex items-center gap-6">
          <a
            href="https://github.com/your-org/manifold/tree/main/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#9C9890] hover:text-[#F0EFE9] transition-colors"
          >
            Docs
          </a>
          <Link
            href="/login"
            className="text-sm text-[#9C9890] hover:text-[#F0EFE9] transition-colors"
          >
            Sign in →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-8 py-20 text-center max-w-3xl mx-auto w-full">
        <div className="mb-10">
          <LogoMark size={64} />
        </div>

        <h1 className="text-5xl font-light tracking-[-0.02em] text-[#F0EFE9] leading-tight mb-4">
          One endpoint.<br />Every connector.
        </h1>

        <p className="text-[#9C9890] text-lg leading-relaxed max-w-xl mb-10">
          Self-hosted MCP access management for teams. One login, one URL, your whole AI stack.
        </p>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-6 py-3 bg-[#C4853A] hover:bg-[#E8A855] text-[#1A1917] text-sm font-semibold rounded-[8px] transition-colors"
          >
            Get started
          </Link>
          <a
            href="https://github.com/your-org/manifold"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 text-[#9C9890] hover:text-[#F0EFE9] text-sm transition-colors border border-[#2A2926] rounded-[8px] hover:border-[#3A3836]"
          >
            View on GitHub
          </a>
        </div>
      </section>

      {/* How it works */}
      <section className="px-8 pb-20 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {HOW_IT_WORKS.map(({ icon: Icon, step, title, body }) => (
            <div key={step} className="bg-[#1A1917] border border-[#2A2926] rounded-[10px] p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[#9C9890] font-mono text-xs">{step}</span>
                <Icon size={16} className="text-[#C4853A]" strokeWidth={1.75} />
              </div>
              <h3 className="text-[#F0EFE9] text-sm font-medium mb-2">{title}</h3>
              <p className="text-[#9C9890] text-xs leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2A2926] px-8 py-6">
        <p className="text-[#6B6966] text-xs text-center">Open source. Self-hosted. Yours.</p>
      </footer>
    </div>
  )
}
