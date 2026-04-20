import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { ManifestSchema } from '../manifest.js'
import { c, spin, step, fatal, section } from '../ui.js'

interface McpTool {
  name:        string
  description?: string
}

async function discoverTools(endpoint: string): Promise<McpTool[]> {
  const controller = new AbortController()
  const timer      = setTimeout(() => controller.abort(), 10_000)

  try {
    const initRes = await fetch(endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id:      1,
        method:  'initialize',
        params:  { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'manifold-cli', version: '0.1.0' } },
      }),
      signal: controller.signal,
    })
    if (!initRes.ok) throw new Error(`initialize returned HTTP ${initRes.status}`)

    const listRes = await fetch(endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }),
      signal: controller.signal,
    })
    if (!listRes.ok) throw new Error(`tools/list returned HTTP ${listRes.status}`)

    const data = await listRes.json() as { result?: { tools?: McpTool[] } }
    return data.result?.tools ?? []
  } finally {
    clearTimeout(timer)
  }
}

export async function runValidate(): Promise<void> {
  const manifestPath = join(process.cwd(), 'manifold.json')
  console.log('')

  if (!existsSync(manifestPath)) {
    fatal('no manifold.json found in current directory.')
  }

  // Parse JSON
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(manifestPath, 'utf8'))
  } catch {
    fatal('manifold.json is not valid JSON.')
  }

  // Schema validation
  const result = ManifestSchema.safeParse(raw)
  if (!result.success) {
    step('schema validation', 'fail')
    console.log('')
    for (const issue of result.error.issues) {
      const path = issue.path.length ? `${c.amber(issue.path.join('.'))}  ` : ''
      console.log(`  ${c.gray('·')}  ${path}${issue.message}`)
    }
    console.log('')
    process.exit(1)
  }

  step('schema valid')

  const manifest = result.data

  // Endpoint connectivity + tool discovery
  const s = spin(`connecting to ${c.amber(manifest.endpoint)}`)
  try {
    const tools = await discoverTools(manifest.endpoint)
    s.succeed(`${tools.length} tool${tools.length === 1 ? '' : 's'} discovered at ${manifest.endpoint}`)

    if (tools.length > 0) {
      section('tools')
      for (const t of tools) {
        const desc = t.description ? `  ${c.gray('—')}  ${c.gray(t.description)}` : ''
        console.log(`  ${c.gray('·')}  ${t.name}${desc}`)
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    s.fail(`endpoint unreachable  ${c.gray(msg)}`)
    console.log('')
    console.log(`  ${c.gray('schema is valid but the endpoint could not be reached.')}`)
    console.log(`  ${c.gray('ensure the server is running before running')} ${c.amber('manifold publish')}${c.gray('.')}`)
    console.log('')
    process.exit(1)
  }

  console.log('')
  console.log(`  ${c.success('✓')}  ${c.bold(`"${manifest.id}"`)} is valid. Ready to publish.`)
  console.log('')
}
