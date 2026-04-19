import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { auditLogs, users } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { redirect } from 'next/navigation'

const ACTION_LABELS: Record<string, string> = {
  'user.role_changed':             'Role changed',
  'connector.enabled':             'Connector enabled',
  'connector.disabled':            'Connector disabled',
  'connector.registered':          'Connector registered',
  'connector.deprecated':          'Connector deprecated',
  'connector.tools_refreshed':     'Tools refreshed',
  'connector.tools_added':         'Tools added',
  'connector.tools_removed':       'Tools removed',
  'connector.health_check_failed': 'Health check failed',
  'config.updated':                'Config updated',
  'config.removed':                'Config removed',
  'oauth.token_issued':            'OAuth token issued',
  'oauth.token_revoked':           'OAuth token revoked',
  'tool.called':                   'Tool called',
  'connector.policy_updated':      'Policy updated',
}

export default async function AdminAuditPage() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') redirect('/connectors')

  const rows = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      detail: auditLogs.detail,
      createdAt: auditLogs.createdAt,
      actorName: users.name,
      actorEmail: users.email,
    })
    .from(auditLogs)
    .innerJoin(users, eq(auditLogs.actorId, users.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(100)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-[#1A1917] text-2xl font-medium tracking-tight">Audit Log</h1>
        <p className="text-[#6B6966] text-sm mt-1">Last {rows.length} events</p>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white border border-[#E3E1DC] rounded-[10px] py-12 text-center text-[#9C9890] text-sm">
          No events recorded yet.
        </div>
      ) : (
        <div className="bg-white border border-[#E3E1DC] rounded-[10px] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E3E1DC]">
                <th className="text-left px-5 py-3 text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em]">Time</th>
                <th className="text-left px-5 py-3 text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em]">Actor</th>
                <th className="text-left px-5 py-3 text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em]">Action</th>
                <th className="text-left px-5 py-3 text-[#6B6966] text-xs font-semibold uppercase tracking-[0.08em]">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E1DC]">
              {rows.map(row => (
                <tr key={row.id} className="hover:bg-[#F5F4F0] transition-colors">
                  <td className="px-5 py-3 text-[#6B6966] text-xs whitespace-nowrap">
                    {new Date(row.createdAt).toLocaleString('en-GB', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-[#1A1917]">{row.actorName}</p>
                    <p className="text-[#6B6966] text-xs">{row.actorEmail}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-[#1A1917] font-medium">
                      {ACTION_LABELS[row.action] ?? row.action}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {row.detail ? (
                      <code className="text-[#C4853A] bg-[#1A1917] text-xs px-2 py-0.5 rounded font-mono">
                        {JSON.stringify(row.detail)}
                      </code>
                    ) : (
                      <span className="text-[#9C9890]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
