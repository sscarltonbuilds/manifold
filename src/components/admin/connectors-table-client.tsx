'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { RefreshConnectorButton } from '@/components/admin/refresh-connector-button'

const PAGE_SIZE = 20

type SortKey = 'name' | 'status' | 'enabledCount' | 'toolCount' | 'version'
type SortDir = 'asc' | 'desc'

interface ConnectorRow {
  id:           string
  name:         string
  description:  string
  status:       string
  authType:     string
  version:      string
  iconUrl:      string | null
  healthStatus: string | null
  toolsChangedAt: Date | string | null
  toolCount:    number
  enabledCount: number
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown size={11} className="text-[#C4B8B0]" />
  return sortDir === 'asc'
    ? <ChevronUp size={11} className="text-[#C4853A]" />
    : <ChevronDown size={11} className="text-[#C4853A]" />
}

function SortTh({ label, col, sortKey, sortDir, onSort, className }: {
  label: string
  col: SortKey
  sortKey: SortKey
  sortDir: SortDir
  onSort: (col: SortKey) => void
  className?: string
}) {
  return (
    <th className={`text-left px-5 py-3 text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em] ${className ?? ''}`}>
      <button
        onClick={() => onSort(col)}
        className="inline-flex items-center gap-1 hover:text-[#1A1917] transition-colors"
      >
        {label}
        <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
      </button>
    </th>
  )
}

export function ConnectorsTableClient({ rows, ago7d }: { rows: ConnectorRow[]; ago7d: Date }) {
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(0)

  const handleSort = (col: SortKey) => {
    if (col === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(col)
      setSortDir('asc')
    }
    setPage(0)
  }

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'name':         cmp = a.name.localeCompare(b.name); break
        case 'status':       cmp = a.status.localeCompare(b.status); break
        case 'enabledCount': cmp = a.enabledCount - b.enabledCount; break
        case 'toolCount':    cmp = a.toolCount - b.toolCount; break
        case 'version':      cmp = a.version.localeCompare(b.version); break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [rows, sortKey, sortDir])

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const page_ = Math.min(page, Math.max(0, totalPages - 1))
  const visible = sorted.slice(page_ * PAGE_SIZE, (page_ + 1) * PAGE_SIZE)

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-white border border-[#E3E1DC] rounded-[10px] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E3E1DC]">
              <SortTh label="Connector" col="name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortTh label="Status" col="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <th className="text-left px-5 py-3 text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em]">Auth</th>
              <SortTh label="Users enabled" col="enabledCount" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortTh label="Tools" col="toolCount" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortTh label="Version" col="version" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E3E1DC]">
            {visible.map(c => {
              const hasDrift = c.toolsChangedAt && new Date(c.toolsChangedAt) >= ago7d
              const healthDotColor =
                c.healthStatus === 'healthy'     ? '#4A7C59' :
                c.healthStatus === 'unreachable' ? '#A3352B' :
                '#9C9890'

              return (
                <tr key={c.id} className="group hover:bg-[#F9F8F6] transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-2 h-2 rounded-full flex-none"
                        style={{ backgroundColor: healthDotColor }}
                        title={c.healthStatus ?? 'not checked'}
                      />
                      {c.iconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.iconUrl} alt="" className="w-5 h-5 object-contain flex-none" />
                      ) : (
                        <div className="w-5 h-5 rounded bg-[#1A1917] flex-none" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/connectors/${c.id}`}
                            className="text-[#1A1917] font-medium hover:text-[#C4853A] transition-colors"
                          >
                            {c.name}
                          </Link>
                          {hasDrift && (
                            <span className="text-[#C4853A] bg-[#FBF3E8] text-[10px] font-semibold uppercase tracking-[0.06em] px-1.5 py-0.5 rounded-full">
                              Tools changed
                            </span>
                          )}
                        </div>
                        <p className="text-[#6B6966] text-xs mt-0.5 max-w-xs truncate">{c.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {c.status === 'active' && (
                      <span className="text-[#4A7C59] bg-[#EBF5EF] text-[11px] font-semibold tracking-[0.06em] uppercase px-2 py-0.5 rounded-full">Active</span>
                    )}
                    {c.status === 'pending' && (
                      <span className="text-[#C4853A] bg-[#FBF3E8] text-[11px] font-semibold tracking-[0.06em] uppercase px-2 py-0.5 rounded-full">Pending</span>
                    )}
                    {c.status === 'deprecated' && (
                      <span className="text-[#9C9890] bg-[#F5F4F0] text-[11px] font-semibold tracking-[0.06em] uppercase px-2 py-0.5 rounded-full">Deprecated</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-[#6B6966] text-xs font-mono">{c.authType}</td>
                  <td className="px-5 py-3.5 text-[#6B6966]">{c.enabledCount}</td>
                  <td className="px-5 py-3.5 text-[#6B6966]">{c.toolCount}</td>
                  <td className="px-5 py-3.5 text-[#6B6966] font-mono text-xs">{c.version}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <RefreshConnectorButton connectorId={c.id} />
                      <Link
                        href={`/admin/connectors/${c.id}`}
                        className="h-7 px-3 inline-flex items-center text-xs font-medium text-[#1A1917] bg-white border border-[#E3E1DC] rounded-[6px] hover:bg-[#F5F4F0] hover:border-[#D4D0C8] transition-colors whitespace-nowrap"
                      >
                        Manage
                      </Link>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-[#9C9890] text-xs">
            {page_ * PAGE_SIZE + 1}–{Math.min((page_ + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page_ === 0}
              className="h-7 px-3 text-xs font-medium text-[#1A1917] bg-white border border-[#E3E1DC] rounded-[6px] hover:bg-[#F5F4F0] transition-colors disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-[#6B6966] text-xs">Page {page_ + 1} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page_ === totalPages - 1}
              className="h-7 px-3 text-xs font-medium text-[#1A1917] bg-white border border-[#E3E1DC] rounded-[6px] hover:bg-[#F5F4F0] transition-colors disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
