/**
 * Background health checker for registered connectors.
 *
 * Runs every 5 minutes (Node.js runtime only, via instrumentation.ts).
 * For each active connector, calls connectAndDiscover() to verify the
 * endpoint is reachable and updates healthStatus + lastHealthCheck in DB.
 *
 * Does NOT update discoveredTools — that requires an explicit admin action
 * so tool diffs surface in the audit log with a known actor.
 */

import { db } from '@/lib/db'
import { connectors } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { connectAndDiscover } from '@/lib/mcp/discovery'

const HEALTH_CHECK_INTERVAL_MS = 5 * 60_000  // 5 minutes
const STAGGER_MS                = 5_000       // 5 seconds between connectors to avoid thundering herd

async function checkConnectorHealth(connectorId: string, endpoint: string): Promise<void> {
  const now = new Date()
  try {
    await connectAndDiscover(endpoint)
    await db.update(connectors)
      .set({ healthStatus: 'healthy', lastHealthCheck: now })
      .where(eq(connectors.id, connectorId))
  } catch {
    await db.update(connectors)
      .set({ healthStatus: 'unreachable', lastHealthCheck: now })
      .where(eq(connectors.id, connectorId))
  }
}

async function runHealthChecks(): Promise<void> {
  let activeConnectors: { id: string; endpoint: string }[]

  try {
    activeConnectors = await db
      .select({ id: connectors.id, endpoint: connectors.endpoint })
      .from(connectors)
      .where(eq(connectors.status, 'active'))
  } catch {
    // DB may be unavailable during startup — skip this cycle
    return
  }

  for (let i = 0; i < activeConnectors.length; i++) {
    const { id, endpoint } = activeConnectors[i]!
    // Stagger checks to avoid hammering all connectors simultaneously
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, STAGGER_MS))
    }
    void checkConnectorHealth(id, endpoint)
  }
}

export function initHealthChecks(): void {
  // Run an initial pass 30 seconds after startup (give the app time to settle)
  const initialDelay = setTimeout(() => {
    void runHealthChecks()
  }, 30_000)

  // Then run on a regular interval
  const interval = setInterval(() => {
    void runHealthChecks()
  }, HEALTH_CHECK_INTERVAL_MS)

  // Ensure the timer doesn't prevent process exit
  if (typeof initialDelay.unref === 'function') initialDelay.unref()
  if (typeof interval.unref === 'function') interval.unref()
}
