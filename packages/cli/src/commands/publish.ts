import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { ManifestSchema } from '../manifest.js'
import { resolveAuth } from '../config.js'
import { apiPost } from '../api.js'

interface PublishResponse {
  ok: boolean
  connector?: { id: string; name: string; toolCount: number }
}

export async function runPublish(opts: { registry?: string; token?: string }): Promise<void> {
  const manifestPath = join(process.cwd(), 'manifold.json')

  if (!existsSync(manifestPath)) {
    console.error('error: no manifold.json found in current directory.')
    process.exit(1)
  }

  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(manifestPath, 'utf8'))
  } catch {
    console.error('error: manifold.json is not valid JSON.')
    process.exit(1)
  }

  const result = ManifestSchema.safeParse(raw)
  if (!result.success) {
    console.error('error: manifold.json schema validation failed. Run `manifold validate` for details.')
    process.exit(1)
  }

  const { registry, token } = resolveAuth(opts)

  console.log(`publishing "${result.data.id}" to ${registry} ...`)

  try {
    const res = await apiPost<PublishResponse>(registry, token, '/api/admin/connectors', {
      manifest: raw,
    })

    if (res.connector) {
      console.log('')
      console.log(`published  ${res.connector.name}`)
      console.log(`id         ${res.connector.id}`)
      console.log(`tools      ${res.connector.toolCount}`)
    } else {
      console.log('published.')
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`error: ${msg}`)
    process.exit(1)
  }
}
