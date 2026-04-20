#!/usr/bin/env node
import { runInit }               from './commands/init.js'
import { runValidate }           from './commands/validate.js'
import { runPublish }            from './commands/publish.js'
import {
  runConnectorsList,
  runConnectorsGet,
  runConnectorsRefresh,
  runConnectorsDeprecate,
} from './commands/connectors.js'
import { runUsersList, runUsersSetRole } from './commands/users.js'
import { runTokensList, runTokensRevoke } from './commands/tokens.js'
import { runLogin, runLogout, runWhoami } from './commands/login.js'
import { c } from './ui.js'

// ---------------------------------------------------------------------------
// Arg parser
// ---------------------------------------------------------------------------

interface ParsedArgs {
  positionals: string[]
  flags: Record<string, string | boolean>
}

function parseArgs(argv: string[]): ParsedArgs {
  const positionals: string[] = []
  const flags: Record<string, string | boolean> = {}

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!
    if (arg === '-y' || arg === '--yes') {
      flags['yes'] = true
    } else if (arg.startsWith('--')) {
      const key  = arg.slice(2)
      const next = argv[i + 1]
      if (next && !next.startsWith('--') && next !== '-y') {
        flags[key] = next
        i++
      } else {
        flags[key] = true
      }
    } else {
      positionals.push(arg)
    }
  }

  return { positionals, flags }
}

function flag(flags: Record<string, string | boolean>, key: string): string | undefined {
  const v = flags[key]
  return typeof v === 'string' ? v : undefined
}

function boolFlag(flags: Record<string, string | boolean>, key: string): boolean {
  return flags[key] === true
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

function printHelp(): void {
  console.log('')
  console.log(`  ${c.bold('manifold')}  ${c.gray('—')}  MCP gateway management`)
  console.log('')
  console.log(`  ${c.bold('connector development')}`)
  console.log(`  ${c.gray('  init [name]')}                 scaffold a ${c.amber('manifold.json')}`)
  console.log(`  ${c.gray('  validate')}                    validate schema + test endpoint`)
  console.log(`  ${c.gray('  publish')}                     submit connector to a Manifold instance`)
  console.log('')
  console.log(`  ${c.bold('registry')}  ${c.gray('(requires --token or manifold login)')}`)
  console.log(`  ${c.gray('  connectors ls')}               list all registered connectors`)
  console.log(`  ${c.gray('  connectors get')} ${c.amber('<id>')}          show details and tool list`)
  console.log(`  ${c.gray('  connectors refresh')} ${c.amber('<id>')}      re-run tool discovery`)
  console.log(`  ${c.gray('  connectors deprecate')} ${c.amber('<id>')}    mark as deprecated`)
  console.log('')
  console.log(`  ${c.bold('users')}`)
  console.log(`  ${c.gray('  users ls')}                    list all users`)
  console.log(`  ${c.gray('  users set-role')} ${c.amber('<email> <role>')}  change role ${c.gray('(admin|member)')}`)
  console.log('')
  console.log(`  ${c.bold('tokens')}`)
  console.log(`  ${c.gray('  tokens ls')}                   list active OAuth tokens`)
  console.log(`  ${c.gray('  tokens revoke')} ${c.amber('<id>')}           revoke a token`)
  console.log('')
  console.log(`  ${c.bold('auth')}`)
  console.log(`  ${c.gray('  login')}                       save credentials to config`)
  console.log(`  ${c.gray('  logout')}                      clear saved credentials`)
  console.log(`  ${c.gray('  whoami')}                      show current config`)
  console.log('')
  console.log(`  ${c.bold('flags')}`)
  console.log(`  ${c.gray('  --registry')} ${c.amber('<url>')}             Manifold instance URL`)
  console.log(`  ${c.gray('  --token')} ${c.amber('<token>')}              admin API key`)
  console.log(`  ${c.gray('  --yes, -y')}                   skip confirmation prompts`)
  console.log(`  ${c.gray('  --version')}                   show version`)
  console.log(`  ${c.gray('  --help')}                      show this help`)
  console.log('')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { positionals, flags } = parseArgs(process.argv.slice(2))

  if (flags['version']) {
    // Read version from package.json at runtime
    const { readFileSync } = await import('node:fs')
    const { join, dirname }  = await import('node:path')
    const { fileURLToPath }  = await import('node:url')
    const __dirname = dirname(fileURLToPath(import.meta.url))
    const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8')) as { version: string }
    console.log(`  manifold ${c.amber(pkg.version)}`)
    process.exit(0)
  }

  if (flags['help'] || positionals.length === 0) {
    printHelp()
    process.exit(0)
  }

  const [cmd, sub, arg1, arg2] = positionals
  const authOpts = {
    registry: flag(flags, 'registry'),
    token:    flag(flags, 'token'),
    yes:      boolFlag(flags, 'yes'),
  }

  switch (cmd) {
    case 'init':
      runInit(sub)
      break

    case 'validate':
      await runValidate()
      break

    case 'publish':
      await runPublish(authOpts)
      break

    case 'connectors':
    case 'connector':
      switch (sub) {
        case 'ls':
        case 'list':
          await runConnectorsList(authOpts)
          break
        case 'get':
          if (!arg1) { console.error(`\n  ${c.error('error')}  usage: manifold connectors get <id>\n`); process.exit(1) }
          await runConnectorsGet(arg1, authOpts)
          break
        case 'refresh':
          if (!arg1) { console.error(`\n  ${c.error('error')}  usage: manifold connectors refresh <id>\n`); process.exit(1) }
          await runConnectorsRefresh(arg1, authOpts)
          break
        case 'deprecate':
          if (!arg1) { console.error(`\n  ${c.error('error')}  usage: manifold connectors deprecate <id>\n`); process.exit(1) }
          await runConnectorsDeprecate(arg1, authOpts)
          break
        default:
          console.error(`\n  ${c.error('error')}  unknown subcommand: connectors ${sub ?? ''}\n`)
          process.exit(1)
      }
      break

    case 'users':
    case 'user':
      switch (sub) {
        case 'ls':
        case 'list':
          await runUsersList(authOpts)
          break
        case 'set-role':
          if (!arg1 || !arg2) {
            console.error(`\n  ${c.error('error')}  usage: manifold users set-role <email> <role>\n`)
            process.exit(1)
          }
          await runUsersSetRole(arg1, arg2, authOpts)
          break
        default:
          console.error(`\n  ${c.error('error')}  unknown subcommand: users ${sub ?? ''}\n`)
          process.exit(1)
      }
      break

    case 'tokens':
    case 'token':
      switch (sub) {
        case 'ls':
        case 'list':
          await runTokensList(authOpts)
          break
        case 'revoke':
          if (!arg1) { console.error(`\n  ${c.error('error')}  usage: manifold tokens revoke <id>\n`); process.exit(1) }
          await runTokensRevoke(arg1, authOpts)
          break
        default:
          console.error(`\n  ${c.error('error')}  unknown subcommand: tokens ${sub ?? ''}\n`)
          process.exit(1)
      }
      break

    case 'login':
      runLogin(authOpts)
      break

    case 'logout':
      runLogout()
      break

    case 'whoami':
      runWhoami()
      break

    default:
      console.error(`\n  ${c.error('error')}  unknown command: ${cmd}`)
      console.error(`  run ${c.amber('manifold --help')} for usage.\n`)
      process.exit(1)
  }
}

main().catch(err => {
  const msg = err instanceof Error ? err.message : String(err)
  console.error(`\n  ${c.error('error')}  ${msg}\n`)
  process.exit(1)
})
