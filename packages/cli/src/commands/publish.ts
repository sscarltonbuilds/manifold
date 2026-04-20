import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { ManifestSchema } from '../manifest.js'
import { resolveAuth } from '../config.js'
import { apiPost } from '../api.js'
import { c, spin, kv, fatal } from '../ui.js'

interface PublishResponse {
  ok:         boolean
  connector?: { id: string; name: string; toolCount: number }
}

export async function runPublish(opts: { registry?: string; token?: string }): Promise<void> {
  const manifestPath = join(process.cwd(), 'manifold.json')
  console.log('')

  if (!existsSync(manifestPath)) {
    fatal('no manifold.json found in current directory.')
  }

  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(manifestPath, 'utf8'))
  } catch {
    fatal('manifold.json is not valid JSON.')
  }

  const result = ManifestSchema.safeParse(raw)
  if (!result.success) {
    fatal(`schema validation failed. Run ${c.amber('manifold validate')} for details.`)
  }

  const { registry, token } = resolveAuth(opts)

  const s = spin(`publishing ${c.amber(`"${result.data.id}"`)} to ${registry}`)

  try {
    const res = await apiPost<PublishResponse>(registry, token, '/api/admin/connectors', { manifest: raw })

    if (res.connector) {
      s.succeed(`published ${c.amber(res.connector.name)}`)
      console.log('')
      kv('id',    res.connector.id)
      kv('tools', String(res.connector.toolCount))
    } else {
      s.succeed('published')
    }
    console.log('')
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    s.fail(msg)
    console.log('')
    process.exit(1)
  }
}
