import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { ManifestSchema } from '../manifest.js'

interface McpTool {
  name: string
  description?: string
}

async function discoverTools(endpoint: string): Promise<McpTool[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10_000)

  try {
    // Send initialize
    const initRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'manifold-cli', version: '0.1.0' },
        },
      }),
      signal: controller.signal,
    })

    if (!initRes.ok) throw new Error(`initialize: HTTP ${initRes.status}`)

    // Send tools/list
    const listRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {},
      }),
      signal: controller.signal,
    })

    if (!listRes.ok) throw new Error(`tools/list: HTTP ${listRes.status}`)

    const data = await listRes.json() as { result?: { tools?: McpTool[] } }
    return data.result?.tools ?? []
  } finally {
    clearTimeout(timer)
  }
}

export async function runValidate(): Promise<void> {
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

  // Schema validation
  process.stdout.write('schema   ')
  const result = ManifestSchema.safeParse(raw)
  if (!result.success) {
    console.log('✗')
    console.error('')
    console.error('validation errors:')
    for (const issue of result.error.issues) {
      const path = issue.path.length ? issue.path.join('.') + ': ' : ''
      console.error(`  ${path}${issue.message}`)
    }
    process.exit(1)
  }
  console.log('✓')

  const manifest = result.data

  // Endpoint reachability + tool discovery
  process.stdout.write(`endpoint ${manifest.endpoint} — connecting... `)
  try {
    const tools = await discoverTools(manifest.endpoint)
    console.log(`✓  (${tools.length} tool${tools.length === 1 ? '' : 's'} discovered)`)
    console.log('')
    if (tools.length > 0) {
      console.log('tools:')
      for (const t of tools) {
        const desc = t.description ? `  — ${t.description}` : ''
        console.log(`  ${t.name}${desc}`)
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log(`✗  (${msg})`)
    console.error('')
    console.error('warning: endpoint unreachable. Schema is valid but connectivity check failed.')
    console.error('         Run `manifold publish` only when the endpoint is reachable.')
    process.exit(1)
  }

  console.log('')
  console.log(`manifest "${manifest.id}" is valid. Ready to publish.`)
}
