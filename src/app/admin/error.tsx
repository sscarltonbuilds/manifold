'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function AdminError({
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
    <div className="flex flex-col items-center justify-center h-full py-24 gap-4 text-center px-8">
      <AlertTriangle size={32} className="text-[#9C9890]" strokeWidth={1.25} />
      <div>
        <p className="text-[#1A1917] font-medium">Something went wrong</p>
        <p className="text-[#6B6966] text-sm mt-1 max-w-xs">
          {error.message ?? 'An unexpected error occurred.'}
        </p>
        {error.digest && (
          <p className="text-[#9C9890] text-xs mt-2 font-mono">
            {error.digest}
          </p>
        )}
      </div>
      <button
        onClick={reset}
        className="inline-flex items-center gap-1.5 text-sm text-[#C4853A] hover:underline"
      >
        <RefreshCw size={13} />
        Try again
      </button>
    </div>
  )
}
