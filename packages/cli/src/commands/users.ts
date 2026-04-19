import { resolveAuth } from '../config.js'
import { apiGet, apiPatch } from '../api.js'

interface UserRow {
  id:           string
  email:        string
  name:         string
  role:         string
  lastActiveAt: string | null
  createdAt:    string
}

interface UsersResponse {
  users: UserRow[]
}

interface UserResponse {
  user: UserRow
}

function formatDate(iso: string | null): string {
  if (!iso) return 'never'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export async function runUsersList(opts: { registry?: string; token?: string }): Promise<void> {
  const { registry, token } = resolveAuth(opts)

  try {
    const { users } = await apiGet<UsersResponse>(registry, token, '/api/admin/users')

    if (users.length === 0) {
      console.log('no users found.')
      return
    }

    const emailWidth = Math.max(5, ...users.map(u => u.email.length))
    const nameWidth  = Math.max(4, ...users.map(u => u.name.length))

    const header = [
      'EMAIL'.padEnd(emailWidth),
      'NAME'.padEnd(nameWidth),
      'ROLE'.padEnd(8),
      'LAST ACTIVE',
    ].join('  ')

    console.log(header)
    console.log('─'.repeat(header.length))

    for (const u of users) {
      console.log([
        u.email.padEnd(emailWidth),
        u.name.padEnd(nameWidth),
        u.role.padEnd(8),
        formatDate(u.lastActiveAt),
      ].join('  '))
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`error: ${msg}`)
    process.exit(1)
  }
}

export async function runUsersSetRole(
  email: string,
  role: string,
  opts: { registry?: string; token?: string },
): Promise<void> {
  if (role !== 'admin' && role !== 'member') {
    console.error('error: role must be "admin" or "member".')
    process.exit(1)
  }

  const { registry, token } = resolveAuth(opts)

  try {
    // Find user by email
    const { users } = await apiGet<UsersResponse>(registry, token, '/api/admin/users')
    const user = users.find(u => u.email === email)

    if (!user) {
      console.error(`error: no user found with email "${email}".`)
      process.exit(1)
    }

    await apiPatch<UserResponse>(registry, token, `/api/admin/users/${user.id}`, { role })
    console.log(`${email} → ${role}`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`error: ${msg}`)
    process.exit(1)
  }
}
