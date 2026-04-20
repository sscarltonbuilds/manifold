'use client'

import { Download } from 'lucide-react'

interface ExportOption {
  type:        string
  label:       string
  description: string
}

const EXPORTS: ExportOption[] = [
  {
    type:        'connectors',
    label:       'Connector registry',
    description: 'All registered connectors with manifests. No credentials.',
  },
  {
    type:        'audit',
    label:       'Audit log',
    description: 'Up to 10,000 recent events as CSV.',
  },
  {
    type:        'backup',
    label:       'Full backup',
    description: 'Connectors, bundles, users, and policies as JSON.',
  },
]

export function ExportClient() {
  const download = (type: string) => {
    const a = document.createElement('a')
    a.href = `/api/admin/export?type=${type}`
    a.download = ''
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="bg-white border border-[#E3E1DC] rounded-[10px] divide-y divide-[#E3E1DC]">
      {EXPORTS.map(opt => (
        <div key={opt.type} className="px-5 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[#1A1917] text-sm font-medium">{opt.label}</p>
            <p className="text-[#9C9890] text-xs mt-0.5">{opt.description}</p>
          </div>
          <button
            onClick={() => download(opt.type)}
            className="flex-none inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#1A1917] bg-white border border-[#E3E1DC] rounded-[8px] hover:bg-[#F5F4F0] transition-colors"
          >
            <Download size={13} />
            Download
          </button>
        </div>
      ))}
    </div>
  )
}
