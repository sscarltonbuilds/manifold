'use client'

import { useEffect, useRef, useState } from 'react'

interface Tab<T extends string> {
  key: T
  label: string
  count?: number
}

interface AnimatedTabsProps<T extends string> {
  tabs: Tab<T>[]
  active: T
  onChange: (key: T) => void
  className?: string
}

/**
 * Pill-style tabs with a sliding indicator.
 *
 * Usage:
 *   <AnimatedTabs
 *     tabs={[{ key: 'all', label: 'All' }, { key: 'tools', label: 'Tools' }]}
 *     active={active}
 *     onChange={setActive}
 *   />
 */
export function AnimatedTabs<T extends string>({
  tabs,
  active,
  onChange,
  className,
}: AnimatedTabsProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })
  const [ready, setReady] = useState(false) // skip transition on first paint

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const btn = container.querySelector<HTMLButtonElement>(`[data-key="${active}"]`)
    if (!btn) return
    setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth })
    setReady(true)
  }, [active])

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center bg-white border border-[#E3E1DC] rounded-[8px] p-0.5 ${className ?? ''}`}
    >
      {/* Sliding pill */}
      <div
        aria-hidden
        className={`absolute top-0.5 bottom-0.5 bg-[#1A1917] rounded-[6px] pointer-events-none ${
          ready ? 'transition-all duration-200 ease-out' : ''
        }`}
        style={{ left: indicator.left, width: indicator.width }}
      />

      {tabs.map(tab => (
        <button
          key={tab.key}
          data-key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`relative z-10 px-3 py-1.5 text-xs font-medium rounded-[6px] whitespace-nowrap transition-colors duration-200 ${
            active === tab.key
              ? 'text-[#F0EFE9]'
              : 'text-[#6B6966] hover:text-[#1A1917]'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={`ml-1.5 text-[10px] ${active === tab.key ? 'text-[#9C9890]' : 'text-[#9C9890]'}`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

/**
 * Underline-style tabs with a sliding amber indicator.
 * Used for page-level tab navigation (connector detail, etc.)
 */
export function AnimatedUnderlineTabs<T extends string>({
  tabs,
  active,
  onChange,
  className,
}: AnimatedTabsProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const btn = container.querySelector<HTMLButtonElement>(`[data-key="${active}"]`)
    if (!btn) return
    setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth })
    setReady(true)
  }, [active])

  return (
    <div
      ref={containerRef}
      className={`relative flex border-b border-[#E3E1DC] ${className ?? ''}`}
    >
      {/* Sliding underline */}
      <div
        aria-hidden
        className={`absolute bottom-0 h-0.5 bg-[#C4853A] pointer-events-none ${
          ready ? 'transition-all duration-200 ease-out' : ''
        }`}
        style={{ left: indicator.left, width: indicator.width }}
      />

      {tabs.map(tab => (
        <button
          key={tab.key}
          data-key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] transition-colors duration-150 ${
            active === tab.key
              ? 'text-[#C4853A]'
              : 'text-[#9C9890] hover:text-[#1A1917]'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="ml-1">{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}
