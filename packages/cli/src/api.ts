/** Thin wrapper around fetch for Manifold admin API calls */

export async function apiGet<T>(registry: string, token: string, path: string): Promise<T> {
  const res = await fetch(`${registry}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await res.json() as Record<string, unknown>
  if (!res.ok) {
    const msg = (body['error'] as { message?: string } | undefined)?.message ?? `HTTP ${res.status}`
    throw new Error(msg)
  }
  return body as T
}

export async function apiPost<T>(
  registry: string,
  token: string,
  path: string,
  data: unknown,
): Promise<T> {
  const res = await fetch(`${registry}${path}`, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  const body = await res.json() as Record<string, unknown>
  if (!res.ok) {
    const err = body['error'] as { message?: string; code?: string } | undefined
    const msg = err?.message ?? `HTTP ${res.status}`
    throw new Error(msg)
  }
  return body as T
}

export async function apiPatch<T>(
  registry: string,
  token: string,
  path: string,
  data: unknown,
): Promise<T> {
  const res = await fetch(`${registry}${path}`, {
    method: 'PATCH',
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  const body = await res.json() as Record<string, unknown>
  if (!res.ok) {
    const err = body['error'] as { message?: string } | undefined
    throw new Error(err?.message ?? `HTTP ${res.status}`)
  }
  return body as T
}

export async function apiDelete<T>(registry: string, token: string, path: string): Promise<T> {
  const res = await fetch(`${registry}${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await res.json() as Record<string, unknown>
  if (!res.ok) {
    const err = body['error'] as { message?: string } | undefined
    throw new Error(err?.message ?? `HTTP ${res.status}`)
  }
  return body as T
}
