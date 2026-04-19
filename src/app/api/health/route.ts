import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { version } from '../../../../package.json'

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`)
    return NextResponse.json({ status: 'ok', db: 'ok', version })
  } catch {
    return NextResponse.json({ status: 'error', db: 'unreachable', version }, { status: 503 })
  }
}
