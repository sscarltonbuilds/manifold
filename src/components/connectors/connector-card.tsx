'use client'

import { useState } from 'react'
import { Plug, CheckCircle2, Circle, Settings2, Lock, Link2 } from 'lucide-react'
import { ConnectorConfigSheet } from './connector-config-sheet'
import { toast } from 'sonner'
import type { AuthField } from '@/lib/manifest'

interface ConnectorInfo {
  id:          string
  name:        string
  description: string
  iconUrl:     string | null
  status:      'pending' | 'active' | 'deprecated'
  authType:    string
  managedBy:   string
}

interface ConnectorCardProps {
  connector:    ConnectorInfo
  authFields:   AuthField[]
  enabled:      boolean
  configured:   boolean
  userId:       string
  bundleSource?: { name: string; required: boolean }
}

export function ConnectorCard({
  connector,
  authFields,
  enabled: initialEnabled,
  configured: initialConfigured,
  bundleSource,
}: ConnectorCardProps) {
  const [enabled, setEnabled]       = useState(initialEnabled)
  const [configured, setConfigured] = useState(initialConfigured)
  const [toggling, setToggling]     = useState(false)
  const [sheetOpen, setSheetOpen]   = useState(false)

  // For admin_managed / none connectors there's nothing to configure per-user
  const needsUserConfig = connector.managedBy === 'user' && connector.authType !== 'none'
  const isOAuth2 = connector.authType === 'oauth2'

  const startOAuthFlow = () => {
    window.location.href = `/api/connectors/${connector.id}/oauth/start`
  }

  const handleToggle = async () => {
    if (!configured && !enabled && needsUserConfig) {
      if (isOAuth2) {
        startOAuthFlow()
      } else {
        setSheetOpen(true)
      }
      return
    }
    setToggling(true)
    try {
      await fetch(`/api/connectors/${connector.id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled }),
      })
      setEnabled(e => !e)
      if (enabled) toast('Connector disabled')
    } finally {
      setToggling(false)
    }
  }

  const handleSaved = () => {
    setConfigured(true)
    setEnabled(true)
  }

  const iconEl = connector.iconUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={connector.iconUrl} alt="" className="w-4 h-4 object-contain" />
  ) : (
    <Plug size={16} strokeWidth={1.75} className="text-[#C4853A]" />
  )

  return (
    <>
      <div className="bg-white border border-[#E3E1DC] rounded-[10px] p-5 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-shadow duration-150">
        <div className="flex items-start justify-between gap-3">
          <div className="w-10 h-10 bg-[#1A1917] rounded-[8px] flex items-center justify-center flex-none">
            {iconEl}
          </div>

          {bundleSource?.required ? (
            <div className="flex items-center gap-1.5 text-[#9C9890] mt-0.5" title={`Required by ${bundleSource.name}`}>
              <Lock size={13} />
              <span className="text-[10px] font-semibold uppercase tracking-[0.06em]">Required</span>
            </div>
          ) : (
            <button
              onClick={handleToggle}
              disabled={toggling}
              className={`relative w-10 h-5 rounded-full transition-colors duration-150 flex-none mt-0.5 ${
                enabled ? 'bg-[#C4853A]' : 'bg-[#3A3836]'
              } ${toggling ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label={enabled ? 'Disable connector' : 'Enable connector'}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-150 ${
                  enabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          )}
        </div>

        <div className="mt-3">
          <h3 className="text-[#1A1917] text-sm font-medium">{connector.name}</h3>
          <p className="text-[#6B6966] text-xs mt-1 leading-relaxed">{connector.description}</p>
          {bundleSource && (
            <span className="inline-flex items-center gap-1 text-[#C4853A] text-[10px] font-semibold uppercase tracking-[0.06em] mt-1.5">
              via {bundleSource.name}
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {(!needsUserConfig || configured) ? (
              <>
                <CheckCircle2 size={12} className="text-[#4A7C59]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#4A7C59]">
                  {needsUserConfig ? 'Configured' : 'No setup needed'}
                </span>
              </>
            ) : (
              <>
                <Circle size={12} className="text-[#9C9890]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9C9890]">
                  Not configured
                </span>
              </>
            )}
          </div>

          {needsUserConfig && (
            isOAuth2 ? (
              <button
                onClick={startOAuthFlow}
                className="flex items-center gap-1 text-[#9C9890] hover:text-[#1A1917] transition-colors"
              >
                <Link2 size={13} />
                <span className="text-xs">{configured ? 'Reconnect' : 'Connect'}</span>
              </button>
            ) : (
              <button
                onClick={() => setSheetOpen(true)}
                className="flex items-center gap-1 text-[#9C9890] hover:text-[#1A1917] transition-colors"
              >
                <Settings2 size={13} />
                <span className="text-xs">Configure</span>
              </button>
            )
          )}
        </div>
      </div>

      {needsUserConfig && !isOAuth2 && (
        <ConnectorConfigSheet
          connectorId={connector.id}
          connectorName={connector.name}
          connectorIcon={iconEl}
          authFields={authFields}
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}
