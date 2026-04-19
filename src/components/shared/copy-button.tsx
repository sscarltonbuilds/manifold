'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export function CopyButton({ value, text }: { value?: string; text?: string }) {
  const [copied, setCopied] = useState(false)
  const content = value ?? text ?? ''

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="text-[#9C9890] hover:text-[#C4853A] transition-colors flex-none"
      title="Copy"
    >
      {copied ? <Check size={14} className="text-[#4A7C59]" /> : <Copy size={14} />}
    </button>
  )
}
