import type { McpTool } from './types'

interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: string | number | null
  result?: unknown
  error?: { code: number; message: string }
}

const TIMEOUT_MS = 10_000

async function jsonRpc(endpoint: string, method: string, params?: unknown, headers?: Record<string, string>): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        ...(params !== undefined ? { params } : {}),
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      throw new Error(`Connector endpoint returned HTTP ${res.status}`)
    }

    const data = await res.json() as JsonRpcResponse
    if (data.error) {
      throw new Error(`MCP error ${data.error.code}: ${data.error.message}`)
    }
    return data.result
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Connector endpoint timed out after ${TIMEOUT_MS / 1000}s`)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Connect to a connector's MCP endpoint, run initialize + tools/list,
 * and return the discovered tool definitions.
 *
 * @param endpoint  - The MCP server URL (e.g. https://pipedrive-mcp.example.com/mcp)
 * @param headers   - Optional headers to inject (e.g. auth credentials for testing)
 */
export async function connectAndDiscover(
  endpoint: string,
  headers?: Record<string, string>,
): Promise<McpTool[]> {
  // Step 1: initialize
  await jsonRpc(endpoint, 'initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'Manifold', version: '1.0.0' },
  }, headers)

  // Step 2: tools/list
  const result = await jsonRpc(endpoint, 'tools/list', {}, headers)

  const tools = (result as { tools?: unknown[] })?.tools
  if (!Array.isArray(tools)) {
    throw new Error('Connector did not return a valid tools/list response')
  }

  // Validate and normalise each tool
  const discovered: McpTool[] = tools.map((t, i) => {
    if (typeof t !== 'object' || t === null) {
      throw new Error(`Tool at index ${i} is not an object`)
    }
    const tool = t as Record<string, unknown>
    if (typeof tool.name !== 'string' || !tool.name) {
      throw new Error(`Tool at index ${i} is missing a name`)
    }
    return {
      name: tool.name,
      description: typeof tool.description === 'string' ? tool.description : '',
      inputSchema: (tool.inputSchema as McpTool['inputSchema']) ?? { type: 'object', properties: {} },
    }
  })

  return discovered
}
