import { db } from '@/lib/db'
import { oauthTokens, users, userConnectorConfigs, connectors, connectorPolicies, connectorAdminConfigs, auditLogs } from '@/lib/db/schema'
import { eq, and, gt } from 'drizzle-orm'
import { hashToken, decrypt, encrypt, computeConfigHmac } from '@/lib/crypto'
import { rateLimit } from '@/lib/rate-limit'
import type { User, Connector } from '@/lib/db/schema'
import type { JsonRpcRequest, JsonRpcResponse, McpTool } from './types'
import type { Manifest, Injection } from '@/lib/manifest'

const PROXY_TIMEOUT_MS = 30_000

// ---------------------------------------------------------------------------
// Built-in Manifold tools
// ---------------------------------------------------------------------------

const MANIFOLD_LIST_CONNECTORS_TOOL = {
  name: 'manifold_list_connectors',
  description:
    'Returns all connectors available in this Manifold instance with per-user enabled/configured status. ' +
    'Call this when a user asks about a capability you cannot currently access, or to understand what integrations ' +
    'exist on their Manifold instance but are not yet enabled or configured.',
  inputSchema: {
    type: 'object' as const,
    properties: {},
    required: [],
  },
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function resolveUser(authHeader: string): Promise<User | null> {
  if (!authHeader.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  const tokenHash = hashToken(token)

  const [row] = await db
    .select({ user: users })
    .from(oauthTokens)
    .innerJoin(users, eq(oauthTokens.userId, users.id))
    .where(and(eq(oauthTokens.tokenHash, tokenHash), gt(oauthTokens.expiresAt, new Date())))
    .limit(1)

  return row?.user ?? null
}

// ---------------------------------------------------------------------------
// Tool list — reads from discoveredTools in DB, applies policy
// ---------------------------------------------------------------------------

export async function getEnabledTools(userId: string): Promise<McpTool[]> {
  // Load all active connectors + their policies in one pass
  const [connectorRows, policyRows, userConfigs] = await Promise.all([
    db.select().from(connectors).where(eq(connectors.status, 'active')),
    db.select().from(connectorPolicies),
    db
      .select({ connectorId: userConnectorConfigs.connectorId })
      .from(userConnectorConfigs)
      .where(and(eq(userConnectorConfigs.userId, userId), eq(userConnectorConfigs.enabled, true))),
  ])

  const policyMap   = new Map(policyRows.map(p => [p.connectorId, p]))
  const enabledSet  = new Set(userConfigs.map(c => c.connectorId))

  const tools: McpTool[] = []

  for (const connector of connectorRows) {
    const policy       = policyMap.get(connector.id)
    const isRequired   = policy?.required ?? false
    const isAdminManaged = connector.managedBy === 'admin' || connector.authType === 'none'

    // Include tools from this connector if:
    //   a) the user has explicitly enabled it, OR
    //   b) it's required AND admin-managed (no per-user credentials needed)
    const include = enabledSet.has(connector.id) || (isRequired && isAdminManaged)
    if (!include) continue

    const disabledTools = new Set<string>(
      Array.isArray(policy?.disabledTools) ? (policy.disabledTools as string[]) : []
    )

    const discovered = connector.discoveredTools as McpTool[] | null
    if (!Array.isArray(discovered)) continue

    for (const tool of discovered) {
      if (disabledTools.has(tool.name)) continue
      tools.push(tool)
    }
  }

  tools.push(MANIFOLD_LIST_CONNECTORS_TOOL)
  return tools
}

// ---------------------------------------------------------------------------
// Built-in Manifold tool handler
// ---------------------------------------------------------------------------

export async function handleManifoldTool(
  userId: string,
  toolName: string,
): Promise<unknown> {
  if (toolName !== 'manifold_list_connectors') {
    throw { code: -32601, message: `Unknown Manifold tool: ${toolName}` }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const [allConnectors, userConfigs] = await Promise.all([
    db
      .select({
        id:              connectors.id,
        name:            connectors.name,
        description:     connectors.description,
        authType:        connectors.authType,
        managedBy:       connectors.managedBy,
        discoveredTools: connectors.discoveredTools,
      })
      .from(connectors)
      .where(eq(connectors.status, 'active')),
    db
      .select({
        connectorId: userConnectorConfigs.connectorId,
        enabled:     userConnectorConfigs.enabled,
      })
      .from(userConnectorConfigs)
      .where(eq(userConnectorConfigs.userId, userId)),
  ])

  const configMap = new Map(userConfigs.map(c => [c.connectorId, c]))

  const connectorList = allConnectors.map(c => {
    const cfg = configMap.get(c.id)
    const needsUserConfig = c.managedBy === 'user' && c.authType !== 'none'
    const configured = needsUserConfig ? !!cfg : true
    const enabled    = cfg?.enabled ?? (!needsUserConfig)
    const toolCount  = Array.isArray(c.discoveredTools) ? (c.discoveredTools as unknown[]).length : 0

    return {
      id:          c.id,
      name:        c.name,
      description: c.description,
      enabled,
      configured,
      toolCount,
      ...((!enabled || !configured) ? { setupUrl: `${appUrl}/connectors` } : {}),
    }
  })

  return {
    connectors: connectorList,
    setupUrl: `${appUrl}/connectors`,
  }
}

// ---------------------------------------------------------------------------
// Credential injection
// ---------------------------------------------------------------------------

function buildHeaders(
  manifest: Manifest,
  decryptedConfig: Record<string, string>,
): Record<string, string> {
  const headers: Record<string, string> = {}
  const auth = manifest.auth

  if (auth.type === 'none') return headers
  if (auth.type === 'admin_managed') return headers // credentials injected separately

  if (auth.type === 'api_key' || auth.type === 'bearer_token') {
    for (const field of auth.fields) {
      if (!field.injection) continue
      const value = decryptedConfig[field.key]
      if (!value) continue

      const injection = field.injection as Injection
      if (injection.method === 'header') {
        headers[injection.name] = value
      } else if (injection.method === 'bearer') {
        headers['Authorization'] = `Bearer ${value}`
      }
      // query-param injections are handled in buildSearchParams
    }
  }

  if (auth.type === 'oauth2') {
    const tokenInfo = decryptedConfig as unknown as { access_token: string; token_type?: string }
    headers['Authorization'] = `Bearer ${tokenInfo.access_token}`
  }

  return headers
}

function buildSearchParams(
  manifest: Manifest,
  decryptedConfig: Record<string, string>,
): URLSearchParams {
  const params = new URLSearchParams()
  const auth = manifest.auth

  if (auth.type === 'api_key' || auth.type === 'bearer_token') {
    for (const field of auth.fields) {
      if (!field.injection) continue
      const value = decryptedConfig[field.key]
      if (!value) continue
      const injection = field.injection as Injection
      if (injection.method === 'query') {
        params.set(injection.name, value)
      }
    }
  }

  return params
}

// ---------------------------------------------------------------------------
// OAuth2 token refresh
// ---------------------------------------------------------------------------

async function refreshOAuthTokenIfNeeded(
  userId: string,
  connector: Connector,
  manifest: Manifest,
  config: Record<string, string>,
): Promise<Record<string, string>> {
  const tokenInfo = config as unknown as {
    access_token: string
    refresh_token?: string | null
    expires_at?: number | null
  }

  if (!tokenInfo.expires_at) return config
  if (Date.now() < tokenInfo.expires_at - 60_000) return config // still valid (with 1-min buffer)
  if (!tokenInfo.refresh_token) return config // expired but no refresh token — let it fail naturally

  const [adminCfg] = await db
    .select()
    .from(connectorAdminConfigs)
    .where(eq(connectorAdminConfigs.connectorId, connector.id))
    .limit(1)

  if (!adminCfg) return config

  const oauthCreds = JSON.parse(decrypt(adminCfg.encryptedConfig)) as { client_id?: string; client_secret?: string }
  if (!oauthCreds.client_id || !oauthCreds.client_secret) return config

  try {
    const auth = manifest.auth
    if (auth.type !== 'oauth2') return config

    const res = await fetch(auth.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'refresh_token',
        refresh_token: tokenInfo.refresh_token,
        client_id:     oauthCreds.client_id,
        client_secret: oauthCreds.client_secret,
      }),
    })
    if (!res.ok) return config // refresh failed, try with old token

    const data = await res.json() as {
      access_token: string
      refresh_token?: string
      expires_in?: number
    }

    const newConfig = {
      access_token:  data.access_token,
      refresh_token: data.refresh_token ?? tokenInfo.refresh_token,
      expires_at:    data.expires_in ? Date.now() + data.expires_in * 1000 : null,
      token_type:    'Bearer',
    }

    // Persist refreshed token
    const configPayload   = JSON.stringify(newConfig)
    const encryptedConfig = encrypt(configPayload)
    const configHmac      = computeConfigHmac(userId, connector.id, encryptedConfig)

    await db.update(userConnectorConfigs)
      .set({ encryptedConfig, configHmac, updatedAt: new Date() })
      .where(and(
        eq(userConnectorConfigs.userId, userId),
        eq(userConnectorConfigs.connectorId, connector.id),
      ))

    return newConfig as unknown as Record<string, string>
  } catch {
    return config // on error, try with existing token
  }
}

// ---------------------------------------------------------------------------
// Proxy tool call
// ---------------------------------------------------------------------------

async function proxyToConnector(
  connector: Connector,
  method: string,
  params: unknown,
  credHeaders: Record<string, string>,
  credParams: URLSearchParams,
): Promise<unknown> {
  const paramStr = credParams.toString()
  const url = paramStr ? `${connector.endpoint}?${paramStr}` : connector.endpoint

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...credHeaders,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      throw new Error(`Connector returned HTTP ${res.status}`)
    }

    const data = await res.json() as { result?: unknown; error?: { code: number; message: string } }
    if (data.error) {
      throw new Error(`Connector error: ${data.error.message}`)
    }
    return data.result
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Connector timed out after ${PROXY_TIMEOUT_MS / 1000}s`)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

export async function proxyToolCall(
  userId: string,
  toolName: string,
  args: unknown,
): Promise<unknown> {
  // Find which connector owns this tool
  const allConnectors = await db.select().from(connectors).where(eq(connectors.status, 'active'))

  let ownerConnector: Connector | undefined
  for (const c of allConnectors) {
    const tools = c.discoveredTools as Array<{ name: string }> | null
    if (Array.isArray(tools) && tools.some(t => t.name === toolName)) {
      ownerConnector = c
      break
    }
  }

  if (!ownerConnector) {
    throw new Error(`Unknown tool: ${toolName}`)
  }

  const manifest = ownerConnector.manifest as Manifest

  // Load credentials
  let decryptedConfig: Record<string, string> = {}

  if (ownerConnector.managedBy === 'admin') {
    // Use org-level admin credentials
    const [adminConfig] = await db
      .select()
      .from(connectorAdminConfigs)
      .where(eq(connectorAdminConfigs.connectorId, ownerConnector.id))
      .limit(1)

    if (adminConfig) {
      decryptedConfig = JSON.parse(decrypt(adminConfig.encryptedConfig)) as Record<string, string>
    }
  } else {
    // Use user's personal credentials
    const [userConfig] = await db
      .select()
      .from(userConnectorConfigs)
      .where(
        and(
          eq(userConnectorConfigs.userId, userId),
          eq(userConnectorConfigs.connectorId, ownerConnector.id),
          eq(userConnectorConfigs.enabled, true),
        )
      )
      .limit(1)

    if (!userConfig) {
      throw new Error(
        `${ownerConnector.name} is not configured or not enabled. Update it at /connectors.`
      )
    }

    decryptedConfig = JSON.parse(decrypt(userConfig.encryptedConfig)) as Record<string, string>

    // Refresh oauth2 token if expired
    if (manifest.auth.type === 'oauth2') {
      decryptedConfig = await refreshOAuthTokenIfNeeded(userId, ownerConnector, manifest, decryptedConfig)
    }
  }

  const credHeaders = buildHeaders(manifest, decryptedConfig)
  const credParams  = buildSearchParams(manifest, decryptedConfig)

  // Load policy — needed for rate limiting and logging
  const [policy] = await db
    .select({ logToolCalls: connectorPolicies.logToolCalls, rateLimitPerHour: connectorPolicies.rateLimitPerHour })
    .from(connectorPolicies)
    .where(eq(connectorPolicies.connectorId, ownerConnector.id))
    .limit(1)

  // Per-tool rate limiting — enforced before the call
  if (policy?.rateLimitPerHour) {
    const limits = policy.rateLimitPerHour as Record<string, number>
    const toolLimit = limits[toolName]
    if (typeof toolLimit === 'number' && toolLimit > 0) {
      const allowed = await rateLimit(`tool:${userId}:${toolName}`, toolLimit, 3_600_000)
      if (!allowed) {
        throw new Error(
          `Rate limit exceeded for tool "${toolName}". Allowed ${toolLimit} calls per hour.`
        )
      }
    }
  }

  const shouldLog = policy?.logToolCalls ?? true

  const startMs = Date.now()
  let success = true
  let errorMessage: string | undefined

  try {
    const result = await proxyToConnector(
      ownerConnector,
      'tools/call',
      { name: toolName, arguments: args },
      credHeaders,
      credParams,
    )
    return result
  } catch (err) {
    success = false
    errorMessage = err instanceof Error ? err.message : 'Unknown error'
    throw err
  } finally {
    if (shouldLog) {
      // Fire-and-forget — don't block the response on log write
      void db.insert(auditLogs).values({
        actorId:     userId,
        connectorId: ownerConnector.id,
        action:      'tool.called',
        detail:      {
          toolName,
          durationMs: Date.now() - startMs,
          success,
          ...(errorMessage ? { error: errorMessage } : {}),
        },
      })
    }
  }
}

// ---------------------------------------------------------------------------
// JSON-RPC handler
// ---------------------------------------------------------------------------

export async function handleJsonRpc(request: JsonRpcRequest, userId: string): Promise<JsonRpcResponse> {
  try {
    switch (request.method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: { listChanged: false } },
            serverInfo: { name: 'Manifold', version: '1.0.0' },
          },
        }

      case 'tools/list': {
        const tools = await getEnabledTools(userId)
        return { jsonrpc: '2.0', id: request.id, result: { tools } }
      }

      case 'tools/call': {
        const { name, arguments: toolArgs } = request.params as { name: string; arguments: unknown }

        // Intercept built-in Manifold tools
        if (typeof name === 'string' && name.startsWith('manifold_')) {
          const toolResult = await handleManifoldTool(userId, name)
          return {
            jsonrpc: '2.0',
            id: request.id,
            result: { content: [{ type: 'text', text: JSON.stringify(toolResult, null, 2) }] },
          }
        }

        const result = await proxyToolCall(userId, name, toolArgs)
        return {
          jsonrpc: '2.0',
          id: request.id,
          result,
        }
      }

      default:
        return {
          jsonrpc: '2.0',
          id: request.id,
          error: { code: -32601, message: `Method not found: ${request.method}` },
        }
    }
  } catch (err) {
    return {
      jsonrpc: '2.0',
      id: request.id,
      error: { code: -32000, message: err instanceof Error ? err.message : 'Internal error' },
    }
  }
}
