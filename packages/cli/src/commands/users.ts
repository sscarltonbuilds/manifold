import { resolveAuth } from '../config.js'
import { apiGet, apiPatch } from '../api.js'
import { c, spin, badge, fmtDate, kv, section, empty } from '../ui.js'

interface UserRow {
  id:           string
  email:        string
  name:         string
  role:         string
  lastActiveAt: string | null
  createdAt:    string
}

interface UsersResponse { users: UserRow[] }
interface UserResponse  { user:  UserRow  }

export async function runUsersList(opts: { registry?: string; token?: string }): Promise<void> {
  const { registry, token } = resolveAuth(opts)
  const s = spin('loading users')

  try {
    const { users } = await apiGet<UsersResponse>(registry, token, '/api/admin/users')
    s.succeed(`${users.length} user${users.length === 1 ? '' : 's'}`)
    console.log('')

    if (users.length === 0) {
      empty('no users found.')
      console.log('')
      return
    }

    const emailW = Math.max(5, ...users.map(u => u.email.length))
    const nameW  = Math.max(4, ...users.map(u => u.name.length))

    const header = [
      'EMAIL'.padEnd(emailW),
      'NAME'.padEnd(nameW),
      'ROLE'.padEnd(8),
      'LAST ACTIVE',
    ].join('  ')

    console.log(`  ${c.bold(c.gray(header))}`)
    console.log(`  ${c.gray('─'.repeat(header.length))}`)

    for (const u of users) {
      const roleBadge = badge(u.role)
      const rolePad   = roleBadge + ' '.repeat(Math.max(0, 8 - u.role.length))
      const cols = [
        u.email.padEnd(emailW),
        c.gray(u.name.padEnd(nameW)),
        rolePad,
        c.gray(fmtDate(u.lastActiveAt)),
      ]
      console.log(`  ${cols.join('  ')}`)
    }
    console.log('')
  } catch (err) {
    s.fail(err instanceof Error ? err.message : String(err))
    console.log('')
    process.exit(1)
  }
}

export async function runUsersSetRole(
  email: string,
  role:  string,
  opts:  { registry?: string; token?: string },
): Promise<void> {
  console.log('')

  if (role !== 'admin' && role !== 'member') {
    console.error(`  ${c.error('error')}  role must be ${c.amber('"admin"')} or ${c.amber('"member"')}.`)
    console.log('')
    process.exit(1)
  }

  const { registry, token } = resolveAuth(opts)
  const s = spin(`updating role for ${c.amber(email)}`)

  try {
    const { users } = await apiGet<UsersResponse>(registry, token, '/api/admin/users')
    const user = users.find(u => u.email === email)

    if (!user) {
      s.fail(`no user found with email "${email}"`)
      console.log('')
      process.exit(1)
    }

    await apiPatch<UserResponse>(registry, token, `/api/admin/users/${user.id}`, { role })
    s.succeed(`${email}  ${c.gray('→')}  ${badge(role)}`)
    console.log('')
  } catch (err) {
    s.fail(err instanceof Error ? err.message : String(err))
    console.log('')
    process.exit(1)
  }
}
