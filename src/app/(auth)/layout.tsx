export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0D0D0B] relative overflow-hidden">
      {/* Dot grid texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #2A2926 1px, transparent 0)',
          backgroundSize: '32px 32px',
          opacity: 0.6,
        }}
      />
      <div className="relative z-10 w-full max-w-sm px-6">
        {children}
      </div>
    </div>
  )
}
