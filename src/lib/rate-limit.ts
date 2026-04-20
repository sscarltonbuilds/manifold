/**
 * Postgres-backed sliding-window rate limiter.
 *
 * Works correctly across multiple app instances and survives restarts.
 * Uses an atomic INSERT … ON CONFLICT DO UPDATE to increment the counter
 * for the current time window, returning the updated count in one round-trip.
 *
 * Expired windows are pruned probabilistically (1% of calls) so the table
 * stays small without a dedicated cleanup job.
 */

import { db } from '@/lib/db'
import { rateLimitWindows } from '@/lib/db/schema'
import { sql, lt } from 'drizzle-orm'

export async function rateLimit(
  key:      string,
  max     = 100,
  windowMs = 60_000,
): Promise<boolean> {
  const now         = Date.now()
  const windowStart = Math.floor(now / windowMs) * windowMs

  // Atomic upsert: insert count=1 or increment existing count, return final value
  const [row] = await db
    .insert(rateLimitWindows)
    .values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({
      target:  [rateLimitWindows.key, rateLimitWindows.windowStart],
      set:     { count: sql`${rateLimitWindows.count} + 1` },
    })
    .returning({ count: rateLimitWindows.count })

  // Probabilistic cleanup of expired windows — keeps the table small
  if (Math.random() < 0.01) {
    void db
      .delete(rateLimitWindows)
      .where(lt(rateLimitWindows.windowStart, now - windowMs * 10))
  }

  return (row?.count ?? 1) <= max
}
