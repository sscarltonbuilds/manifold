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

// ---------------------------------------------------------------------------
// Minimal arg parser — no external deps
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
    if (arg.startsWith('--')) {
      const key  = arg.slice(2)
      const next = argv[i + 1]
      if (next && !next.startsWith('--')) {
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

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

const HELP = `
manifold — CLI for Manifold MCP gateway management

usage:
  manifold <command> [subcommand] [options]

connector development:
  init [name]              scaffold a manifold.json in current directory
  validate                 validate local manifold.json + test endpoint
  publish                  submit connector to a Manifold instance

registry management (requires --token or manifold login):
  connectors ls            list all registered connectors
  connectors get <id>      show connector details and tool list
  connectors refresh <id>  re-run tool discovery
  connectors deprecate <id> mark connector as deprecated

user management:
  users ls                 list all users
  users set-role <email> <role>  change user role (admin|member)

token management:
  tokens ls                list active OAuth tokens
  tokens revoke <id>       revoke a token

auth:
  login                    save registry + token to config
  logout                   clear saved credentials
  whoami                   show current config

options:
  --registry <url>         Manifold instance URL (or MANIFOLD_REGISTRY env var)
  --token <token>          admin API token (or MANIFOLD_TOKEN env var)
  --help                   show this help
`.trim()

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { positionals, flags } = parseArgs(process.argv.slice(2))

  if (flags['help'] || positionals.length === 0) {
    console.log(HELP)
    process.exit(0)
  }

  const [cmd, sub, arg1, arg2] = positionals
  const authOpts = {
    registry: flag(flags, 'registry'),
    token:    flag(flags, 'token'),
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
          if (!arg1) { console.error('usage: manifold connectors get <id>'); process.exit(1) }
          await runConnectorsGet(arg1, authOpts)
          break
        case 'refresh':
          if (!arg1) { console.error('usage: manifold connectors refresh <id>'); process.exit(1) }
          await runConnectorsRefresh(arg1, authOpts)
          break
        case 'deprecate':
          if (!arg1) { console.error('usage: manifold connectors deprecate <id>'); process.exit(1) }
          await runConnectorsDeprecate(arg1, authOpts)
          break
        default:
          console.error(`unknown subcommand: connectors ${sub ?? ''}`)
          console.error('run `manifold --help` for usage.')
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
            console.error('usage: manifold users set-role <email> <role>')
            process.exit(1)
          }
          await runUsersSetRole(arg1, arg2, authOpts)
          break
        default:
          console.error(`unknown subcommand: users ${sub ?? ''}`)
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
          if (!arg1) { console.error('usage: manifold tokens revoke <id>'); process.exit(1) }
          await runTokensRevoke(arg1, authOpts)
          break
        default:
          console.error(`unknown subcommand: tokens ${sub ?? ''}`)
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
      console.error(`unknown command: ${cmd}`)
      console.error('run `manifold --help` for usage.')
      process.exit(1)
  }
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
})
