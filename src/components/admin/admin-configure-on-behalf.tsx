'use client'

import { useState } from 'react'
import { Settings2, Plug } from 'lucide-react'
import { ConnectorConfigSheet } from '@/components/connectors/connector-config-sheet'
import type { AuthField } from '@/lib/manifest'

interface Props {
  userId:    string
  connector: {
    id:         string
    name:       string
    iconUrl:    string | null
    authFields: AuthField[]
  }
}

export function AdminConfigureOnBehalf({ userId, connector }: Props) {
  const [open, setOpen] = useState(false)

  const icon = connector.iconUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={connector.iconUrl} alt="" className="w-4 h-4 object-contain" />
  ) : (
    <Plug size={16} strokeWidth={1.75} className="text-[#C4853A]" />
  )

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-[#9C9890] hover:text-[#C4853A] transition-colors"
      >
        <Settings2 size={13} />Configure
      </button>

      <ConnectorConfigSheet
        connectorId={connector.id}
        connectorName={connector.name}
        connectorIcon={icon}
        authFields={connector.authFields}
        open={open}
        onClose={() => setOpen(false)}
        onSaved={() => setOpen(false)}
        apiBase={`/api/admin/users/${userId}/connectors`}
      />
    </>
  )
}
