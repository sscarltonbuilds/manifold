import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { orgSettings } from '@/lib/db/schema'
import { z } from 'zod'

const ALLOWED_KEYS = ['org_logo_url', 'allowed_domains'] as const
type SettingKey = typeof ALLOWED_KEYS[number]

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: 'forbidden' } }, { status: 403 })
  }

  const rows = await db.select().from(orgSettings)
  const settings: Record<string, string> = {}
  for (const row of rows) settings[row.key] = row.value
  return NextResponse.json({ settings })
}

const PutSchema = z.object({
  key:   z.enum(ALLOWED_KEYS),
  value: z.string().max(700_000), // data URLs for logos can be up to ~680KB; other values are small
})

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: { code: 'forbidden' } }, { status: 403 })
  }

  const parsed = PutSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'validation_error', message: parsed.error.message } },
      { status: 400 },
    )
  }

  const { key, value } = parsed.data

  await db
    .insert(orgSettings)
    .values({ key: key as SettingKey, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: orgSettings.key,
      set: { value, updatedAt: new Date() },
    })

  return NextResponse.json({ ok: true })
}
