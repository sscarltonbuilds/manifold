import { saveConfig, clearConfig, getConfig } from '../config.js'
import { c, step, kv } from '../ui.js'

export function runLogin(opts: { registry?: string; token?: string }): void {
  const registry = opts.registry ?? process.env['MANIFOLD_REGISTRY']
  const token    = opts.token    ?? process.env['MANIFOLD_TOKEN']

  if (!registry || !token) {
    console.error('')
    console.error(`  ${c.bold('usage')}  manifold login --registry <url> --token <token>`)
    console.error('')
    console.error(`  ${c.gray('generate an API key from')} ${c.amber('Admin → Settings → API Keys')}${c.gray('.')}`)
    console.error('')
    process.exit(1)
  }

  const base = registry.replace(/\/$/, '')
  saveConfig({ registry: base, token })
  console.log('')
  step(`logged in to ${c.amber(base)}`)
  console.log('')
}

export function runLogout(): void {
  clearConfig()
  console.log('')
  step('credentials cleared')
  console.log('')
}

export function runWhoami(): void {
  const cfg = getConfig()
  console.log('')
  if (!cfg.registry && !cfg.token) {
    console.log(`  ${c.gray('not logged in.')}`)
    console.log(`  ${c.gray('run')} ${c.amber('manifold login --registry <url> --token <token>')}`)
    console.log('')
    return
  }
  kv('registry', cfg.registry ? c.amber(cfg.registry) : c.gray('(not set)'))
  kv('token',    cfg.token    ? c.gray(cfg.token.slice(0, 12) + '…') : c.gray('(not set)'))
  console.log('')
}
