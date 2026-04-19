import { resolveAuth } from '../config.js'
import { apiGet, apiDelete } from '../api.js'

interface TokenRow {
  id:        string
  clientId:  string
  expiresAt: string
  createdAt: string
}

interface TokensResponse {
  tokens: TokenRow[]
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export async function runTokensList(opts: { registry?: string; token?: string }): Promise<void> {
  const { registry, token } = resolveAuth(opts)

  try {
    const { tokens } = await apiGet<TokensResponse>(registry, token, '/api/admin/tokens')

    if (tokens.length === 0) {
      console.log('no active tokens.')
      return
    }

    const clientWidth = Math.max(9, ...tokens.map(t => t.clientId.length))

    const header = [
      'ID'.padEnd(8),
      'CLIENT ID'.padEnd(clientWidth),
      'EXPIRES'.padEnd(13),
      'CREATED',
    ].join('  ')

    console.log(header)
    console.log('─'.repeat(header.length))

    for (const t of tokens) {
      console.log([
        t.id.slice(0, 8).padEnd(8),
        t.clientId.padEnd(clientWidth),
        formatDate(t.expiresAt).padEnd(13),
        formatDate(t.createdAt),
      ].join('  '))
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`error: ${msg}`)
    process.exit(1)
  }
}

export async function runTokensRevoke(
  id: string,
  opts: { registry?: string; token?: string },
): Promise<void> {
  const { registry, token } = resolveAuth(opts)

  try {
    await apiDelete(registry, token, `/api/admin/tokens/${id}`)
    console.log(`token ${id} revoked.`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`error: ${msg}`)
    process.exit(1)
  }
}
