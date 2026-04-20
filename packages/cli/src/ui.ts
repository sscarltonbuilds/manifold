/**
 * Manifold CLI — UI primitives
 *
 * Zero external dependencies. Pure ANSI + Node built-ins.
 */

import { createInterface } from 'node:readline'

// ---------------------------------------------------------------------------
// ANSI colour helpers
// ---------------------------------------------------------------------------

const ESC    = '\x1b'
const RESET  = `${ESC}[0m`
const BOLD   = `${ESC}[1m`
const DIM    = `${ESC}[2m`
const GREEN  = `${ESC}[32m`
const RED    = `${ESC}[31m`
const YELLOW = `${ESC}[33m`
const GRAY   = `${ESC}[90m`

/** Detect colour support — skip ANSI in pipes/non-TTY */
const colours = process.stdout.isTTY && process.env['NO_COLOR'] === undefined

const a = (code: string, s: string) => colours ? `${code}${s}${RESET}` : s

export const c = {
  amber:   (s: string) => a(YELLOW, s),
  success: (s: string) => a(GREEN, s),
  error:   (s: string) => a(RED, s),
  dim:     (s: string) => a(DIM, s),
  bold:    (s: string) => a(BOLD, s),
  gray:    (s: string) => a(GRAY, s),
}

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠣', '⠏']

export interface Spinner {
  update(msg: string): void
  succeed(msg?: string): void
  fail(msg?: string): void
}

export function spin(label: string): Spinner {
  const isTTY = process.stdout.isTTY

  let frame   = 0
  let current = label
  let timer: ReturnType<typeof setInterval> | null = null

  const tick = () => FRAMES[frame % FRAMES.length]!

  if (isTTY) {
    process.stdout.write(`  ${c.amber(tick())}  ${current}`)
    timer = setInterval(() => {
      frame++
      process.stdout.write(`\r  ${c.amber(tick())}  ${current}${' '.repeat(4)}`)
    }, 80)
  } else {
    process.stdout.write(`  …  ${current}\n`)
  }

  const stop = () => {
    if (timer) { clearInterval(timer); timer = null }
  }

  return {
    update(msg: string) {
      current = msg
      if (isTTY) {
        process.stdout.write(`\r  ${c.amber(tick())}  ${msg}${' '.repeat(4)}`)
      }
    },
    succeed(msg?: string) {
      stop()
      const text = msg ?? current
      if (isTTY) {
        process.stdout.write(`\r  ${c.success('✓')}  ${text}${' '.repeat(Math.max(0, current.length - text.length + 4))}\n`)
      } else {
        console.log(`  ✓  ${text}`)
      }
    },
    fail(msg?: string) {
      stop()
      const text = msg ?? current
      if (isTTY) {
        process.stdout.write(`\r  ${c.error('✗')}  ${text}${' '.repeat(Math.max(0, current.length - text.length + 4))}\n`)
      } else {
        console.log(`  ✗  ${text}`)
      }
    },
  }
}

// ---------------------------------------------------------------------------
// Static status line (no animation)
// ---------------------------------------------------------------------------

export function step(label: string, status: 'ok' | 'fail' | 'skip' = 'ok'): void {
  const icon = status === 'ok' ? c.success('✓') : status === 'fail' ? c.error('✗') : c.gray('–')
  console.log(`  ${icon}  ${label}`)
}

// ---------------------------------------------------------------------------
// Confirm prompt (y/N)
// ---------------------------------------------------------------------------

export async function confirm(msg: string): Promise<boolean> {
  if (!process.stdout.isTTY) return false
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(`  ${msg} ${c.gray('[y/N]')} `, answer => {
      rl.close()
      resolve(answer.trim().toLowerCase() === 'y')
    })
  })
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

export function badge(status: string): string {
  switch (status) {
    case 'active':     return c.success(status)
    case 'deprecated': return c.gray(status)
    case 'pending':    return c.amber(status)
    case 'admin':      return c.amber(status)
    case 'member':     return c.gray(status)
    default:           return status
  }
}

// ---------------------------------------------------------------------------
// Date formatting
// ---------------------------------------------------------------------------

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return c.gray('—')
  return new Date(iso).toLocaleDateString('en-GB', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  })
}

// ---------------------------------------------------------------------------
// Table rendering
// ---------------------------------------------------------------------------

export interface Column {
  header: string
  width:  number
  align?: 'left' | 'right'
}

export function tableHeader(cols: Column[]): void {
  const headers = cols.map(col => col.header.padEnd(col.width)).join('  ')
  const divider = cols.map(col => '─'.repeat(col.width)).join('──')
  console.log(`  ${c.bold(headers)}`)
  console.log(`  ${c.gray(divider)}`)
}

export function tableRow(cols: Column[], values: string[]): void {
  const row = cols.map((col, i) => {
    const v = values[i] ?? ''
    return col.align === 'right' ? v.padStart(col.width) : v.padEnd(col.width)
  }).join('  ')
  console.log(`  ${row}`)
}

// ---------------------------------------------------------------------------
// Key-value detail block
// ---------------------------------------------------------------------------

export function kv(key: string, value: string, keyWidth = 14): void {
  console.log(`  ${c.gray(key.padEnd(keyWidth))}  ${value}`)
}

// ---------------------------------------------------------------------------
// Section divider
// ---------------------------------------------------------------------------

export function section(title: string): void {
  console.log('')
  console.log(`  ${c.bold(title)}`)
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

export function empty(msg: string): void {
  console.log(`  ${c.gray(msg)}`)
}

// ---------------------------------------------------------------------------
// Error + exit
// ---------------------------------------------------------------------------

export function fatal(msg: string): never {
  console.error(`\n  ${c.error('error')}  ${msg}\n`)
  process.exit(1)
}
