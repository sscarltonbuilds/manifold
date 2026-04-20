import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { db } from '@/lib/db'
import {
  connectors,
  auditLogs,
  users,
  bundles,
  bundleConnectors,
  connectorPolicies,
} from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10)
}

function escapeCSV(value: unknown): string {
  if (value == null) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: { code: 'forbidden' } }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')

  if (type === 'connectors') {
    const rows = await db.select().from(connectors)
    const json = JSON.stringify(rows.map(c => ({
      id:          c.id,
      name:        c.name,
      description: c.description,
      version:     c.version,
      status:      c.status,
      endpoint:    c.endpoint,
      authType:    c.authType,
      managedBy:   c.managedBy,
      manifest:    c.manifest,
      createdAt:   c.createdAt,
      updatedAt:   c.updatedAt,
    })), null, 2)

    return new NextResponse(json, {
      headers: {
        'Content-Type':        'application/json',
        'Content-Disposition': `attachment; filename="manifold-connectors-${dateStamp()}.json"`,
      },
    })
  }

  if (type === 'audit') {
    const rows = await db
      .select({
        createdAt:   auditLogs.createdAt,
        actorEmail:  users.email,
        action:      auditLogs.action,
        connectorId: auditLogs.connectorId,
        detail:      auditLogs.detail,
      })
      .from(auditLogs)
      .innerJoin(users, eq(auditLogs.actorId, users.id))
      .orderBy(auditLogs.createdAt)
      .limit(10_000)

    const header = 'timestamp,actor_email,action,connector_id,detail'
    const csvRows = rows.map(r =>
      [
        escapeCSV(r.createdAt?.toISOString()),
        escapeCSV(r.actorEmail),
        escapeCSV(r.action),
        escapeCSV(r.connectorId),
        escapeCSV(r.detail ? JSON.stringify(r.detail) : ''),
      ].join(',')
    )
    const csv = [header, ...csvRows].join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type':        'text/csv',
        'Content-Disposition': `attachment; filename="manifold-audit-${dateStamp()}.csv"`,
      },
    })
  }

  if (type === 'backup') {
    const [allConnectors, allBundles, allBundleConnectors, allPolicies, allUsers] = await Promise.all([
      db.select().from(connectors),
      db.select().from(bundles),
      db.select().from(bundleConnectors),
      db.select().from(connectorPolicies),
      db.select({
        email:     users.email,
        name:      users.name,
        role:      users.role,
        createdAt: users.createdAt,
      }).from(users),
    ])

    const backup = {
      exportedAt: new Date().toISOString(),
      version:    '1',
      connectors: allConnectors.map(c => ({
        id:          c.id,
        name:        c.name,
        description: c.description,
        version:     c.version,
        status:      c.status,
        endpoint:    c.endpoint,
        authType:    c.authType,
        managedBy:   c.managedBy,
        manifest:    c.manifest,
        createdAt:   c.createdAt,
      })),
      bundles: allBundles.map(b => ({
        id:          b.id,
        name:        b.name,
        emoji:       b.emoji,
        description: b.description,
        createdAt:   b.createdAt,
        connectors:  allBundleConnectors
          .filter(bc => bc.bundleId === b.id)
          .map(bc => ({ connectorId: bc.connectorId, required: bc.required })),
      })),
      users:    allUsers,
      policies: allPolicies.map(p => ({
        connectorId:      p.connectorId,
        required:         p.required,
        visibleToRoles:   p.visibleToRoles,
        disabledTools:    p.disabledTools,
        rateLimitPerHour: p.rateLimitPerHour,
      })),
    }

    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        'Content-Type':        'application/json',
        'Content-Disposition': `attachment; filename="manifold-backup-${dateStamp()}.json"`,
      },
    })
  }

  return NextResponse.json(
    { error: { code: 'invalid_type', message: 'type must be connectors, audit, or backup' } },
    { status: 400 }
  )
}
