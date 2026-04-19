'use client'

import { HelpCircle } from 'lucide-react'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface HelpTooltipProps {
  children: React.ReactNode
  /** Optional "Learn more" URL — shown as a link at the bottom of the tooltip. Docs TODO. */
  docsHref?: string
}

interface TooltipPos {
  top: number
  left: number
}

export function HelpTooltip({ children, docsHref }: HelpTooltipProps) {
  const [open, setOpen]   = useState(false)
  const [pos, setPos]     = useState<TooltipPos>({ top: 0, left: 0 })
  const btnRef            = useRef<HTMLButtonElement>(null)
  const tooltipRef        = useRef<HTMLDivElement>(null)

  const reposition = useCallback(() => {
    if (!btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    setPos({
      top:  r.top + window.scrollY,   // anchor to button top
      left: r.left + r.width / 2 + window.scrollX,
    })
  }, [])

  const handleToggle = () => {
    reposition()
    setOpen(v => !v)
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        btnRef.current?.contains(e.target as Node) ||
        tooltipRef.current?.contains(e.target as Node)
      ) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    // Reposition on scroll / resize in case the page shifts
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      document.removeEventListener('mousedown', handler)
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open, reposition])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        className="text-[#9C9890] hover:text-[#6B6966] transition-colors ml-1.5 flex-none"
        aria-label="Help"
      >
        <HelpCircle size={13} strokeWidth={1.75} />
      </button>

      {open && createPortal(
        <>
          <style>{`
            @keyframes tooltipIn {
              from { opacity: 0; transform: translate(-50%, -4px); }
              to   { opacity: 1; transform: translate(-50%, 0); }
            }
          `}</style>
          <div
            ref={tooltipRef}
            style={{
              position: 'fixed',
              top:      pos.top - 8,
              left:     pos.left,
              transform: 'translate(-50%, -100%)',
              zIndex:   9999,
              animation: 'tooltipIn 120ms ease-out',
            }}
            className="w-56 bg-[#1A1917] rounded-[8px] px-3 py-2.5 shadow-xl pointer-events-auto"
          >
            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1A1917]" />

            <p className="text-[#F0EFE9] text-xs leading-relaxed">{children}</p>

            {docsHref && (
              <a
                href={docsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#C4853A] text-xs hover:underline mt-1.5 block"
              >
                Learn more →
              </a>
            )}
          </div>
        </>,
        document.body,
      )}
    </>
  )
}
