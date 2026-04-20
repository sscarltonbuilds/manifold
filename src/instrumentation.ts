export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { env } = await import('./lib/env')
    // Accessing env triggers Zod parse — throws with a clear message if invalid
    void env

    // Start background health checks for active connectors
    const { initHealthChecks } = await import('./lib/health-check')
    initHealthChecks()
  }
}
