import { writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { c, step, fatal } from '../ui.js'

const TEMPLATE = {
  manifestVersion: '1',
  id:              'my-connector',
  name:            'My Connector',
  version:         '1.0.0',
  description:     'What does this connector do?',
  endpoint:        'https://your-mcp-server.example.com/mcp',
  auth: {
    type:    'api_key',
    managed: 'user',
    fields:  [
      {
        key:         'apiKey',
        label:       'API Key',
        description: 'Where to find this key',
        secret:      true,
        required:    true,
        injection:   { method: 'header', name: 'X-Api-Key' },
      },
    ],
  },
}

export function runInit(name?: string): void {
  const outPath = join(process.cwd(), 'manifold.json')

  if (existsSync(outPath)) {
    fatal('manifold.json already exists in this directory.')
  }

  const manifest = structuredClone(TEMPLATE)
  if (name) {
    manifest.id   = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    manifest.name = name
  }

  writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8')

  console.log('')
  step('manifold.json created')
  console.log('')
  console.log(`  ${c.bold('next steps')}`)
  console.log(`  ${c.gray('1')}  edit ${c.amber('manifold.json')} — fill in id, name, endpoint, and auth fields`)
  console.log(`  ${c.gray('2')}  ${c.amber('manifold validate')}  — check schema + test endpoint connectivity`)
  console.log(`  ${c.gray('3')}  ${c.amber('manifold publish')}   — submit to your Manifold instance`)
  console.log('')
}
