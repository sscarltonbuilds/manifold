'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogoMark } from '@/components/shared/logo-mark'
import { CopyButton } from '@/components/shared/copy-button'
import { CheckCircle2, Loader2, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

const STEPS = ['MCP URL', 'OAuth credentials', 'First connector']

export function OnboardingWizard() {
  const router = useRouter()
  const [step, setStep] = useState(0)

  return (
    <div
      className="min-h-screen bg-[#0D0D0B] flex flex-col items-center justify-center px-4"
      style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, #2A2926 1px, transparent 0)',
        backgroundSize: '32px 32px',
      }}
    >
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <LogoMark size={40} />
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 ${i <= step ? 'text-[#C4853A]' : 'text-[#6B6966]'}`}>
                {i < step ? (
                  <CheckCircle2 size={14} />
                ) : (
                  <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[11px] font-bold ${
                    i === step ? 'border-[#C4853A] text-[#C4853A]' : 'border-[#2A2926] text-[#6B6966]'
                  }`}>
                    {i + 1}
                  </span>
                )}
                <span className="text-xs font-medium hidden sm:block">{label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-px ${i < step ? 'bg-[#C4853A]' : 'bg-[#2A2926]'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-[#1A1917] border border-[#2A2926] rounded-[12px] overflow-hidden">
          {step === 0 && <StepMcpUrl onNext={() => setStep(1)} />}
          {step === 1 && <StepOAuth onNext={() => setStep(2)} />}
          {step === 2 && <StepConnector onDone={() => router.push('/connectors')} />}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 1 — MCP URL
// ---------------------------------------------------------------------------

function StepMcpUrl({ onNext }: { onNext: () => void }) {
  const mcpUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/mcp`

  return (
    <div className="p-8 flex flex-col gap-6">
      <div>
        <h2 className="text-[#F0EFE9] text-lg font-medium">Copy your MCP URL</h2>
        <p className="text-[#9C9890] text-sm mt-1">
          Add this to your AI tool&apos;s org settings as a remote MCP connector.
        </p>
      </div>

      <div className="bg-[#0D0D0B] border border-[#2A2926] rounded-[8px] px-4 py-3 flex items-center justify-between gap-3">
        <code className="text-[#C4853A] font-mono text-sm break-all">{mcpUrl}</code>
        <CopyButton value={mcpUrl} />
      </div>

      <div className="bg-[#0D0D0B] border border-[#2A2926] rounded-[8px] p-4">
        <p className="text-[#9C9890] text-xs leading-relaxed">
          In your AI tool&apos;s settings, find the remote MCP or tool integration section and paste this URL. It will use it to discover and call your enabled connectors.
        </p>
      </div>

      <button
        onClick={onNext}
        className="w-full py-2.5 bg-[#C4853A] hover:bg-[#E8A855] text-[#1A1917] text-sm font-semibold rounded-[8px] transition-colors"
      >
        I&apos;ve added it →
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 2 — OAuth credentials
// ---------------------------------------------------------------------------

function StepOAuth({ onNext }: { onNext: () => void }) {
  const [clientId, setClientId] = useState('')
  const [secret, setSecret]     = useState('')
  const [loading, setLoading]   = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [generated, setGenerated]   = useState(false)

  const generate = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/oauth-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'MCP Client' }),
      })
      const data = await res.json() as { clientId?: string; clientSecret?: string }
      if (data.clientId && data.clientSecret) {
        setClientId(data.clientId)
        setSecret(data.clientSecret)
        setGenerated(true)
      }
    } finally {
      setLoading(false)
    }
  }

  if (!generated) {
    return (
      <div className="p-8 flex flex-col gap-6">
        <div>
          <h2 className="text-[#F0EFE9] text-lg font-medium">Generate OAuth credentials</h2>
          <p className="text-[#9C9890] text-sm mt-1">
            These go in your AI tool&apos;s OAuth settings alongside the MCP URL.
          </p>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="w-full py-2.5 bg-[#C4853A] hover:bg-[#E8A855] text-[#1A1917] text-sm font-semibold rounded-[8px] transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          Generate credentials
        </button>
      </div>
    )
  }

  return (
    <div className="p-8 flex flex-col gap-5">
      <div>
        <h2 className="text-[#F0EFE9] text-lg font-medium">Copy your credentials</h2>
        <p className="text-[#9C9890] text-sm mt-1">The secret is shown once. Store it somewhere safe.</p>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <p className="text-[#9C9890] text-xs font-semibold uppercase tracking-[0.08em] mb-1">Client ID</p>
          <div className="bg-[#0D0D0B] border border-[#2A2926] rounded-[8px] px-4 py-3 flex items-center justify-between gap-3">
            <code className="text-[#C4853A] font-mono text-xs break-all">{clientId}</code>
            <CopyButton value={clientId} />
          </div>
        </div>

        <div>
          <p className="text-[#9C9890] text-xs font-semibold uppercase tracking-[0.08em] mb-1">Client Secret</p>
          <div className="bg-[#0D0D0B] border border-[#2A2926] rounded-[8px] px-4 py-3 flex items-center justify-between gap-3">
            <code className="text-[#C4853A] font-mono text-xs break-all">
              {showSecret ? secret : '••••••••••••••••••••••••••••••••'}
            </code>
            <div className="flex items-center gap-2 flex-none">
              <button
                onClick={() => setShowSecret(s => !s)}
                className="text-[#6B6966] hover:text-[#F0EFE9] transition-colors"
              >
                {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <CopyButton value={secret} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 bg-[#2E1A0A] border border-[#5C3012] rounded-[8px] px-4 py-3">
        <AlertTriangle size={13} className="text-[#C4853A] flex-none mt-0.5" />
        <p className="text-[#C4853A] text-xs">
          The secret will not be shown again. Copy it now.
        </p>
      </div>

      <button
        onClick={onNext}
        className="w-full py-2.5 bg-[#C4853A] hover:bg-[#E8A855] text-[#1A1917] text-sm font-semibold rounded-[8px] transition-colors"
      >
        Done →
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 3 — First connector
// ---------------------------------------------------------------------------

function StepConnector({ onDone }: { onDone: () => void }) {
  const [manifestUrl, setManifestUrl] = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState('')

  const register = async () => {
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/admin/connectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manifestUrl }),
      })
      const data = await res.json() as {
        ok?: boolean
        connector?: { name: string; toolCount: number }
        error?: { message?: string }
      }
      if (!res.ok || !data.ok) {
        setError(data.error?.message ?? 'Failed to register connector')
        return
      }
      setSuccess(`${data.connector?.name} registered — ${data.connector?.toolCount} tools discovered.`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 flex flex-col gap-6">
      <div>
        <h2 className="text-[#F0EFE9] text-lg font-medium">Add your first connector</h2>
        <p className="text-[#9C9890] text-sm mt-1">
          Paste a <code className="font-mono">manifold.json</code> URL. Manifold discovers tools automatically.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <input
          type="url"
          value={manifestUrl}
          onChange={e => { setManifestUrl(e.target.value); setError('') }}
          placeholder="https://your-connector.example.com/manifold.json"
          className="bg-[#0D0D0B] border border-[#2A2926] focus:border-[#C4853A] rounded-[8px] px-3 py-2.5 text-sm text-[#F0EFE9] outline-none font-mono transition-colors placeholder:text-[#6B6966]"
        />
        {error && <p className="text-[#A3352B] text-xs">{error}</p>}
        {success && (
          <div className="flex items-center gap-2 text-[#4A7C59] text-xs">
            <CheckCircle2 size={13} />
            {success}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {!success ? (
          <button
            onClick={register}
            disabled={loading || !manifestUrl}
            className="w-full py-2.5 bg-[#C4853A] hover:bg-[#E8A855] text-[#1A1917] text-sm font-semibold rounded-[8px] transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? 'Registering…' : 'Register connector'}
          </button>
        ) : (
          <button
            onClick={onDone}
            className="w-full py-2.5 bg-[#C4853A] hover:bg-[#E8A855] text-[#1A1917] text-sm font-semibold rounded-[8px] transition-colors"
          >
            Go to dashboard →
          </button>
        )}

        {!success && (
          <button
            onClick={onDone}
            className="w-full py-2 text-[#6B6966] hover:text-[#F0EFE9] text-sm transition-colors"
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  )
}
