'use client'

import { AlertTriangle } from 'lucide-react'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html>
      <body className="min-h-screen bg-[#F5F4F0] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center px-8 max-w-sm">
          <AlertTriangle size={36} className="text-[#9C9890]" strokeWidth={1.25} />
          <div>
            <p className="text-[#1A1917] font-medium text-lg">Something went wrong</p>
            <p className="text-[#6B6966] text-sm mt-1">
              {error.message ?? 'An unexpected error occurred.'}
            </p>
          </div>
          <button
            onClick={reset}
            className="text-sm bg-[#C4853A] hover:bg-[#E8A855] text-[#1A1917] font-semibold px-4 py-2 rounded-[8px] transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
