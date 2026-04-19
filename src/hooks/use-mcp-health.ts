'use client'

import { useState, useEffect, useCallback } from 'react'

export type McpHealthStatus = 'checking' | 'online' | 'offline'

const POLL_INTERVAL_MS = 30_000

export function useMcpHealth(): McpHealthStatus {
  const [status, setStatus] = useState<McpHealthStatus>('checking')

  const check = useCallback(async () => {
    try {
      const res = await fetch('/api/health', { cache: 'no-store' })
      setStatus(res.ok ? 'online' : 'offline')
    } catch {
      setStatus('offline')
    }
  }, [])

  useEffect(() => {
    void check()
    const interval = setInterval(() => void check(), POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [check])

  return status
}
