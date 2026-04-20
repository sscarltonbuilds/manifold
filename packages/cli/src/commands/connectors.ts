import { resolveAuth } from '../config.js'
import { apiGet, apiPost, apiPatch } from '../api.js'
import { c, spin, badge, fmtDate, kv, section, empty, confirm } from '../ui.js'

interface ConnectorRow {
  id:                string
  name:              string
  version:           string
  status:            string
  authType:          string
  discoveredTools:   unknown[] | null
  toolsDiscoveredAt: string | null
  updatedAt:         string
}

interface ConnectorsListResponse { connectors: ConnectorRow[] }

interface ConnectorDetailRow extends ConnectorRow {
  endpoint?: string
  manifest?: unknown
}

interface ConnectorResponse { connector: ConnectorDetailRow }

export async function runConnectorsList(opts: { registry?: string; token?: string }): Promise<void> {
  const { registry, token } = resolveAuth(opts)
  const s = spin('loading connectors')

  try {
    const { connectors } = await apiGet<ConnectorsListResponse>(registry, token, '/api/admin/connectors')
    s.succeed(`${connectors.length} connector${connectors.length === 1 ? '' : 's'}`)
    console.log('')

    if (connectors.length === 0) {
      empty('no connectors registered.')
      console.log('')
      return
    }

    const idW   = Math.max(2,  ...connectors.map(r => r.id.length))
    const nameW = Math.max(4,  ...connectors.map(r => r.name.length))
    const verW  = Math.max(7,  ...connectors.map(r => r.version.length))

    const header = [
      'ID'.padEnd(idW),
      'NAME'.padEnd(nameW),
      'VERSION'.padEnd(verW),
      'STATUS'.padEnd(12),
      'TOOLS'.padEnd(6),
      'UPDATED',
    ].join('  ')

    console.log(`  ${c.bold(c.gray(header))}`)
    console.log(`  ${c.gray('─'.repeat(header.length))}`)

    for (const row of connectors) {
      const tools   = Array.isArray(row.discoveredTools) ? String(row.discoveredTools.length) : '—'
      const stat    = badge(row.status)
      const statPad = stat + ' '.repeat(Math.max(0, 12 - row.status.length))
      const cols = [
        c.bold(row.id.padEnd(idW)),
        row.name.padEnd(nameW),
        c.gray(row.version.padEnd(verW)),
        statPad,
        tools.padEnd(6),
        c.gray(fmtDate(row.updatedAt)),
      ]
      console.log(`  ${cols.join('  ')}`)
    }
    console.log('')
  } catch (err) {
    s.fail(err instanceof Error ? err.message : String(err))
    console.log('')
    process.exit(1)
  }
}

export async function runConnectorsGet(id: string, opts: { registry?: string; token?: string }): Promise<void> {
  const { registry, token } = resolveAuth(opts)
  const s = spin(`loading ${c.amber(id)}`)

  try {
    const { connector } = await apiGet<ConnectorResponse>(registry, token, `/api/admin/connectors/${id}`)
    const tools = Array.isArray(connector.discoveredTools)
      ? connector.discoveredTools as Array<{ name: string; description?: string }>
      : []
    s.succeed(connector.name)
    console.log('')

    kv('id',         c.amber(connector.id))
    kv('version',    connector.version)
    kv('status',     badge(connector.status))
    kv('auth type',  connector.authType)
    if (connector.endpoint) kv('endpoint', connector.endpoint)
    kv('tools',      String(tools.length))
    if (connector.toolsDiscoveredAt) kv('discovered', fmtDate(connector.toolsDiscoveredAt))

    if (tools.length > 0) {
      section('tools')
      for (const t of tools) {
        const desc = t.description ? `  ${c.gray('—')}  ${c.gray(t.description)}` : ''
        console.log(`  ${c.gray('·')}  ${t.name}${desc}`)
      }
    }
    console.log('')
  } catch (err) {
    s.fail(err instanceof Error ? err.message : String(err))
    console.log('')
    process.exit(1)
  }
}

export async function runConnectorsRefresh(id: string, opts: { registry?: string; token?: string }): Promise<void> {
  const { registry, token } = resolveAuth(opts)
  const s = spin(`refreshing tools for ${c.amber(id)}`)

  try {
    const res = await apiPost<{ ok: boolean; toolCount?: number }>(
      registry, token, `/api/admin/connectors/${id}/refresh-tools`, {},
    )
    s.succeed(`${res.toolCount ?? '—'} tool${res.toolCount === 1 ? '' : 's'} discovered`)
    console.log('')
  } catch (err) {
    s.fail(err instanceof Error ? err.message : String(err))
    console.log('')
    process.exit(1)
  }
}

export async function runConnectorsDeprecate(
  id:   string,
  opts: { registry?: string; token?: string; yes?: boolean },
): Promise<void> {
  console.log('')

  if (!opts.yes) {
    const ok = await confirm(`deprecate connector ${c.amber(`"${id}"`)}?`)
    if (!ok) {
      console.log(`  ${c.gray('cancelled.')}`)
      console.log('')
      return
    }
  }

  const { registry, token } = resolveAuth(opts)
  const s = spin(`deprecating ${c.amber(id)}`)

  try {
    await apiPatch(registry, token, `/api/admin/connectors/${id}`, { status: 'deprecated' })
    s.succeed(`${id} deprecated`)
    console.log('')
  } catch (err) {
    s.fail(err instanceof Error ? err.message : String(err))
    console.log('')
    process.exit(1)
  }
}
