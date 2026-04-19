'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, Suspense } from 'react'
import { LogoMark } from '@/components/shared/logo-mark'
import { Plug } from 'lucide-react'

function ConsentForm() {
  const params = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const clientId = params.get('client_id') ?? ''
  const redirectUri = params.get('redirect_uri') ?? ''
  const codeChallenge = params.get('code_challenge') ?? ''
  const codeChallengeMethod = params.get('code_challenge_method') ?? 'S256'
  const state = params.get('state') ?? ''

  const handleAuthorize = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/oauth/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, redirect_uri: redirectUri, code_challenge: codeChallenge, code_challenge_method: codeChallengeMethod, state }),
      })
      const data = await res.json() as { redirect?: string; error?: string }
      if (data.redirect) {
        window.location.href = data.redirect
      } else {
        setError(data.error ?? 'Authorization failed')
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    const url = new URL(redirectUri)
    url.searchParams.set('error', 'access_denied')
    if (state) url.searchParams.set('state', state)
    router.push(url.toString())
  }

  return (
    <div className="min-h-screen bg-[#0D0D0B] flex items-center justify-center relative">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #2A2926 1px, transparent 0)',
          backgroundSize: '32px 32px',
          opacity: 0.6,
        }}
      />

      <div className="relative z-10 bg-[#1A1917] border border-[#2A2926] rounded-2xl p-8 w-full max-w-sm flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col items-center gap-4">
          <LogoMark size={36} />
          <div className="text-center">
            <h1 className="text-[#F0EFE9] text-lg font-medium">Authorise access</h1>
            <p className="text-[#9C9890] text-sm mt-1">
              An MCP client is requesting access to your connectors.
            </p>
          </div>
        </div>

        {/* Permission summary */}
        <div className="bg-[#0D0D0B] border border-[#2A2926] rounded-[10px] p-4 flex items-start gap-3">
          <Plug size={15} className="text-[#C4853A] flex-none mt-0.5" strokeWidth={1.75} />
          <p className="text-[#9C9890] text-sm">
            Read and execute your enabled connectors on your behalf.
          </p>
        </div>

        {/* Client ID */}
        <div>
          <p className="text-[#6B6966] text-xs mb-1">Requesting client</p>
          <code className="text-[#C4853A] font-mono text-xs break-all">{clientId}</code>
        </div>

        {error && (
          <p className="text-[#A3352B] text-sm text-center">{error}</p>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={handleAuthorize}
            disabled={loading}
            className="w-full bg-[#C4853A] hover:bg-[#E8A855] text-[#1A1917] font-semibold text-sm py-2.5 rounded-[8px] transition-colors disabled:opacity-50"
          >
            {loading ? 'Authorising…' : 'Authorise'}
          </button>
          <button
            onClick={handleCancel}
            className="w-full text-[#6B6966] hover:text-[#F0EFE9] text-sm py-2 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ConsentPage() {
  return (
    <Suspense>
      <ConsentForm />
    </Suspense>
  )
}
