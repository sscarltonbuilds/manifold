import { writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const TEMPLATE = {
  manifestVersion: '1',
  id: 'my-connector',
  name: 'My Connector',
  version: '1.0.0',
  description: 'What does this connector do?',
  endpoint: 'https://your-mcp-server.example.com/mcp',
  auth: {
    type: 'api_key',
    managed: 'user',
    fields: [
      {
        key: 'apiKey',
        label: 'API Key',
        description: 'Where to find this key',
        secret: true,
        required: true,
        injection: { method: 'header', name: 'X-Api-Key' },
      },
    ],
  },
}

export function runInit(name?: string): void {
  const dir     = process.cwd()
  const outPath = join(dir, 'manifold.json')

  if (existsSync(outPath)) {
    console.error('error: manifold.json already exists in this directory.')
    process.exit(1)
  }

  const manifest = { ...TEMPLATE }
  if (name) {
    manifest.id   = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    manifest.name = name
  }

  writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8')

  console.log('created  manifold.json')
  console.log('')
  console.log('next steps:')
  console.log('  1. edit manifold.json — set id, name, endpoint, auth fields')
  console.log('  2. manifold validate   — check schema + test endpoint connectivity')
  console.log('  3. manifold publish    — submit to your Manifold instance')
}
