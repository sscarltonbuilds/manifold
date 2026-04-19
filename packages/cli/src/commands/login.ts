import { saveConfig, clearConfig, getConfig } from '../config.js'

export function runLogin(opts: { registry?: string; token?: string }): void {
  const registry = opts.registry ?? process.env['MANIFOLD_REGISTRY']
  const token    = opts.token    ?? process.env['MANIFOLD_TOKEN']

  if (!registry || !token) {
    console.error('usage: manifold login --registry <url> --token <token>')
    console.error('')
    console.error('generate a token from your Manifold admin settings page.')
    process.exit(1)
  }

  saveConfig({ registry: registry.replace(/\/$/, ''), token })
  console.log(`logged in to ${registry.replace(/\/$/, '')}`)
}

export function runLogout(): void {
  clearConfig()
  console.log('logged out.')
}

export function runWhoami(): void {
  const cfg = getConfig()
  if (!cfg.registry && !cfg.token) {
    console.log('not logged in.')
    return
  }
  console.log(`registry  ${cfg.registry ?? '(not set)'}`)
  console.log(`token     ${cfg.token ? cfg.token.slice(0, 8) + '...' : '(not set)'}`)
}
