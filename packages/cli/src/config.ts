import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const CONFIG_DIR  = join(homedir(), '.config', 'manifold')
const CONFIG_FILE = join(CONFIG_DIR, 'config.json')

interface Config {
  registry?: string
  token?:    string
}

function read(): Config {
  if (!existsSync(CONFIG_FILE)) return {}
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf8')) as Config
  } catch {
    return {}
  }
}

function write(cfg: Config): void {
  mkdirSync(CONFIG_DIR, { recursive: true })
  writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8')
}

export function getConfig(): Config {
  return read()
}

export function saveConfig(partial: Partial<Config>): void {
  write({ ...read(), ...partial })
}

export function clearConfig(): void {
  write({})
}

/** Resolve registry + token from flags → env → stored config → error */
export function resolveAuth(opts: { registry?: string; token?: string }): { registry: string; token: string } {
  const cfg      = read()
  const registry = opts.registry ?? process.env['MANIFOLD_REGISTRY'] ?? cfg.registry
  const token    = opts.token    ?? process.env['MANIFOLD_TOKEN']    ?? cfg.token

  if (!registry) {
    console.error('error: no registry set. Run `manifold login` or pass --registry.')
    process.exit(1)
  }
  if (!token) {
    console.error('error: no token set. Run `manifold login` or pass --token.')
    process.exit(1)
  }

  return {
    registry: registry.replace(/\/$/, ''),
    token,
  }
}
