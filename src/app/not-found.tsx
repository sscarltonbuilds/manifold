import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F5F4F0] flex items-center justify-center">
      <div className="text-center">
        <p className="text-[#9C9890] font-mono text-xs uppercase tracking-[0.12em] mb-3">404</p>
        <h1 className="text-[#1A1917] text-2xl font-light tracking-tight mb-2">Page not found</h1>
        <p className="text-[#6B6966] text-sm mb-6">This page doesn&apos;t exist.</p>
        <Link
          href="/connectors"
          className="text-sm text-[#C4853A] hover:underline"
        >
          Go to connectors
        </Link>
      </div>
    </div>
  )
}
