import { resolveAuth } from '../config.js'
import { apiGet, apiDelete } from '../api.js'
import { c, spin, fmtDate, empty, confirm } from '../ui.js'

interface TokenRow {
  id:        string
  clientId:  string
  expiresAt: string
  createdAt: string
  userEmail?: string
}

interface TokensResponse { tokens: TokenRow[] }

export async function runTokensList(opts: { registry?: string; token?: string }): Promise<void> {
  const { registry, token } = resolveAuth(opts)
  const s = spin('loading tokens')

  try {
    const { tokens } = await apiGet<TokensResponse>(registry, token, '/api/admin/tokens')
    s.succeed(`${tokens.length} active token${tokens.length === 1 ? '' : 's'}`)
    console.log('')

    if (tokens.length === 0) {
      empty('no active tokens.')
      console.log('')
      return
    }

    const clientW = Math.max(9,  ...tokens.map(t => t.clientId.length))
    const emailW  = Math.max(5,  ...tokens.map(t => (t.userEmail ?? '').length))

    const header = [
      'ID'.padEnd(8),
      'CLIENT'.padEnd(clientW),
      'USER'.padEnd(emailW),
      'EXPIRES'.padEnd(13),
      'CREATED',
    ].join('  ')

    console.log(`  ${c.bold(c.gray(header))}`)
    console.log(`  ${c.gray('─'.repeat(header.length))}`)

    for (const t of tokens) {
      const cols = [
        c.amber(t.id.slice(0, 8)).padEnd(8),
        c.gray(t.clientId.padEnd(clientW)),
        (t.userEmail ?? c.gray('—')).padEnd(emailW),
        fmtDate(t.expiresAt).padEnd(13),
        c.gray(fmtDate(t.createdAt)),
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

export async function runTokensRevoke(
  id:   string,
  opts: { registry?: string; token?: string; yes?: boolean },
): Promise<void> {
  console.log('')

  if (!opts.yes) {
    const ok = await confirm(`revoke token ${c.amber(id.slice(0, 8) + '…')}?`)
    if (!ok) {
      console.log(`  ${c.gray('cancelled.')}`)
      console.log('')
      return
    }
  }

  const { registry, token } = resolveAuth(opts)
  const s = spin('revoking token')

  try {
    await apiDelete(registry, token, `/api/admin/tokens/${id}`)
    s.succeed(`token ${id.slice(0, 8)}… revoked`)
    console.log('')
  } catch (err) {
    s.fail(err instanceof Error ? err.message : String(err))
    console.log('')
    process.exit(1)
  }
}
