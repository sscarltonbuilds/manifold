import { resolveAuth } from '../config.js'
import { apiGet, apiPost, apiPatch } from '../api.js'

interface ConnectorRow {
  id:               string
  name:             string
  version:          string
  status:           string
  authType:         string
  discoveredTools:  unknown[] | null
  toolsDiscoveredAt: string | null
  updatedAt:         string
}

interface ConnectorsListResponse {
  connectors: ConnectorRow[]
}

interface ConnectorResponse {
  connector: ConnectorRow & { endpoint?: string; manifest?: unknown }
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export async function runConnectorsList(opts: { registry?: string; token?: string }): Promise<void> {
  const { registry, token } = resolveAuth(opts)

  try {
    const { connectors } = await apiGet<ConnectorsListResponse>(registry, token, '/api/admin/connectors')

    if (connectors.length === 0) {
      console.log('no connectors registered.')
      return
    }

    const idWidth   = Math.max(2, ...connectors.map(c => c.id.length))
    const nameWidth = Math.max(4, ...connectors.map(c => c.name.length))

    const header = [
      'ID'.padEnd(idWidth),
      'NAME'.padEnd(nameWidth),
      'VERSION'.padEnd(9),
      'STATUS'.padEnd(12),
      'TOOLS'.padEnd(6),
      'UPDATED',
    ].join('  ')

    console.log(header)
    console.log('─'.repeat(header.length))

    for (const c of connectors) {
      const tools = Array.isArray(c.discoveredTools) ? String(c.discoveredTools.length) : '—'
      console.log([
        c.id.padEnd(idWidth),
        c.name.padEnd(nameWidth),
        c.version.padEnd(9),
        c.status.padEnd(12),
        tools.padEnd(6),
        formatDate(c.updatedAt),
      ].join('  '))
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`error: ${msg}`)
    process.exit(1)
  }
}

export async function runConnectorsGet(
  id: string,
  opts: { registry?: string; token?: string },
): Promise<void> {
  const { registry, token } = resolveAuth(opts)

  try {
    const { connector } = await apiGet<ConnectorResponse>(
      registry, token, `/api/admin/connectors/${id}`,
    )

    const tools = Array.isArray(connector.discoveredTools) ? connector.discoveredTools : []

    console.log(`id         ${connector.id}`)
    console.log(`name       ${connector.name}`)
    console.log(`version    ${connector.version}`)
    console.log(`status     ${connector.status}`)
    console.log(`auth type  ${connector.authType}`)
    if (connector.endpoint) console.log(`endpoint   ${connector.endpoint}`)
    console.log(`tools      ${tools.length}`)
    if (connector.toolsDiscoveredAt) {
      console.log(`discovered ${formatDate(connector.toolsDiscoveredAt)}`)
    }

    if (tools.length > 0) {
      console.log('')
      console.log('tool list:')
      for (const t of tools as Array<{ name: string; description?: string }>) {
        const desc = t.description ? `  — ${t.description}` : ''
        console.log(`  ${t.name}${desc}`)
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`error: ${msg}`)
    process.exit(1)
  }
}

export async function runConnectorsRefresh(
  id: string,
  opts: { registry?: string; token?: string },
): Promise<void> {
  const { registry, token } = resolveAuth(opts)

  try {
    const res = await apiPost<{ ok: boolean; toolCount?: number }>(
      registry, token, `/api/admin/connectors/${id}/refresh-tools`, {},
    )
    console.log(`refreshed. tools: ${res.toolCount ?? '—'}`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`error: ${msg}`)
    process.exit(1)
  }
}

export async function runConnectorsDeprecate(
  id: string,
  opts: { registry?: string; token?: string },
): Promise<void> {
  const { registry, token } = resolveAuth(opts)

  try {
    await apiPatch(registry, token, `/api/admin/connectors/${id}`, { status: 'deprecated' })
    console.log(`connector "${id}" deprecated.`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`error: ${msg}`)
    process.exit(1)
  }
}
