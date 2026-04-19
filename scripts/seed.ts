import { config } from 'dotenv'
config({ path: '.env.local' })

import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { users } from '../src/lib/db/schema'
import { eq } from 'drizzle-orm'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const db = drizzle(pool)

async function seed() {
  const email = process.env.SEED_ADMIN_EMAIL
  if (!email) throw new Error('SEED_ADMIN_EMAIL env var required')

  const name = process.env.SEED_ADMIN_NAME ?? email.split('@')[0]

  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1)

  if (existing.length > 0) {
    await db.update(users).set({ role: 'admin' }).where(eq(users.email, email))
    console.log(`Updated ${email} to admin`)
  } else {
    await db.insert(users).values({ email, name, role: 'admin' })
    console.log(`Created admin user: ${email}`)
  }

  await pool.end()
}

seed().catch(err => {
  console.error(err)
  process.exit(1)
})
