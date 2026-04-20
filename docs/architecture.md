# Manifold Architecture

Manifold is an authentication and routing layer for MCP (Model Context Protocol) servers. It does not execute tool logic. It does not have built-in connectors. Every tool call passes through Manifold for identity resolution, credential injection, and proxying — then the actual work happens on an external MCP server.

This document covers the internals for developers deploying Manifold, security reviewers, and connector developers who need to understand what happens to a request end-to-end.

---

## Design Principles

**Pure gateway.** Manifold owns two things: identity and credentials. It knows who a user is, what connectors they have enabled, and what credentials those connectors need. It does not know how tools work, does not cache responses, and does not transform tool results. A tool call either reaches its connector endpoint or it fails with a structured error — nothing in between.

**No built-in connectors.** The connectors directory does not exist. Every connector is an external MCP server described by a `manifold.json` manifest. Connector code lives wherever the connector developer deploys it. Manifold stores the manifest, the cached tool list, and the credentials. That is the full extent of Manifold's involvement with any given connector.

**Per-user credential isolation.** Credentials are stored per user, encrypted with AES-256-GCM, and never returned to the UI in plaintext after the initial save. A compromised user session exposes nothing beyond what that user explicitly configured. Admin-managed connectors are the exception: one encrypted credential set shared across all users, stored separately in `connectorAdminConfigs`.

**One deployment, one organisation.** Manifold is self-hosted. There is no multi-tenancy across organisations. One Manifold instance serves one org. This keeps the data model simple and the security boundary clear.

---

## System Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            AI Tool (Claude, etc.)                           │
│                    POST /mcp  Authorization: Bearer {token}                 │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                 Manifold                                    │
│                                                                             │
│   ┌──────────────────┐   ┌──────────────────┐   ┌───────────────────────┐  │
│   │  OAuth 2.1 Server│   │   MCP Gateway    │   │     Admin UI          │  │
│   │                  │   │                  │   │                       │  │
│   │  /oauth/authorize│   │  Token resolve   │   │  Connector registry   │  │
│   │  /oauth/token    │   │  tools/list      │   │  User management      │  │
│   │  /.well-known/.. │   │  tools/call      │   │  Policy controls      │  │
│   └──────────────────┘   │  Credential      │   │  Audit log            │  │
│                          │  injection       │   │  OAuth clients        │  │
│                          └────────┬─────────┘   └───────────────────────┘  │
│                                   │                                         │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │                        Credential Vault                              │  │
│   │      AES-256-GCM encrypted blobs in PostgreSQL                       │  │
│   │      userConnectorConfigs · connectorAdminConfigs                    │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
└───────────┬───────────────────────┬──────────────────────┬──────────────────┘
            │                       │                      │
            ▼                       ▼                      ▼
    ┌───────────────┐     ┌──────────────────┐    ┌──────────────────┐
    │  Connector A  │     │   Connector B    │    │   Connector C    │
    │  (external    │     │   (external      │    │   (external      │
    │   MCP server) │     │    MCP server)   │    │    MCP server)   │
    └───────────────┘     └──────────────────┘    └──────────────────┘
```

The MCP gateway is the only component that touches the credential vault at request time. The admin UI manages registry state and policies. The OAuth server handles the token issuance flow that lets AI tools authenticate in the first place.

---

## Request Lifecycle — Tool Call

A complete `tools/call` request from an AI tool to a connector endpoint.

**1. Receive request**

```
POST /mcp
Authorization: Bearer a3f9c2e1...
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "pipedrive_list_deals",
    "arguments": { "status": "open" }
  }
}
```

**2. Token resolution**

`resolveUser(authHeader)` extracts the Bearer token, computes `SHA-256(token)`, and looks up the hash in the `oauth_tokens` table. The plaintext token is never stored. If no matching row is found, or if `expiresAt` is in the past, the gateway returns `401 Unauthorized`. If valid, the call continues and `users.lastActiveAt` is updated.

**3. Rate limit check**

An in-memory per-token counter enforces 100 requests per minute. Requests exceeding the limit return `429 Too Many Requests` with `Retry-After: 60`. This counter resets on process restart — see Limitations.

**4. Find the owning connector**

`proxyToolCall(userId, "pipedrive_list_deals", args)` scans the `discoveredTools` JSON arrays of all active connectors to find which connector registered a tool with that name. Tool names must be unique across active connectors — this is enforced at registration time. If no connector owns the tool name, the gateway returns a JSON-RPC method-not-found error.

**5. Load credentials**

The connector's `managedBy` field determines the source:

- `managedBy === 'user'` — load the row from `userConnectorConfigs` where `userId` and `connectorId` match, and `enabled = true`. If no row exists or `enabled = false`, return a JSON-RPC error indicating the connector is not configured for this user.
- `managedBy === 'admin'` — load from `connectorAdminConfigs` for this connector. Admin credentials are shared across all users.

**6. Decrypt credentials**

`decrypt(encryptedConfig)` runs AES-256-GCM decryption. The stored format is `{keyVersion}:{ivHex}:{authTagHex}:{ciphertextHex}`. The auth tag verification happens during decryption — any tampering with the ciphertext throws before credentials are used.

The decrypted value is a JSON string containing the config fields defined in the manifest (e.g. `{ "apiToken": "abc123" }`).

**7. Build the outbound request**

The manifest's `auth.fields[*].injection` spec determines how credentials are attached:

| `injection.method` | Result |
|---|---|
| `"header"` | `{name}: {value}` added to request headers |
| `"query"` | `?{name}={value}` appended to the endpoint URL |
| `"bearer"` | `Authorization: Bearer {value}` header |

**8. Proxy to connector endpoint**

An HTTP POST is sent to `connector.endpoint` with:
- The original JSON-RPC body (`method: "tools/call"`, `params: { name, arguments }`)
- Credentials injected per the injection spec
- 30-second timeout

The connector is an external MCP server. It receives the call, executes the tool, and returns a JSON-RPC response.

**9. Return response**

The connector's response is passed through unmodified. Manifold does not cache it, transform it, or log its contents. If the connector returns an error response, that error is forwarded as-is. If the connector is unreachable or times out, the gateway returns a structured JSON-RPC error with a `CONNECTION_ERROR` or `TIMEOUT` code.

---

## Request Lifecycle — tools/list

**1–3.** Same token resolution and rate limit check as above.

**4. Load enabled connectors**

Query `userConnectorConfigs` where `userId` matches and `enabled = true`. This returns a list of connector IDs the user has explicitly enabled.

Also include any connectors where `connectorPolicies.required = true` — these are force-enabled for all users regardless of their `userConnectorConfigs` state.

**5. Load cached tool definitions**

For each enabled connector ID, load `connectors.discoveredTools` — the JSON array cached from the last `tools/list` call to that connector's endpoint. This is a database read, not a live call to the connector.

**6. Apply policy filters**

For each connector, check `connectorPolicies.disabledTools` — an array of tool names the admin has disabled. Remove any matching tools from the list before returning.

**7. Return merged list**

All tool definitions from all enabled connectors, after filtering, are concatenated and returned as a single `tools/list` response. The AI tool sees one flat list of tools with no indication of which connector owns each one.

---

## OAuth 2.1 Flow

Manifold implements OAuth 2.1 Authorization Code + PKCE. This is how AI tools obtain the Bearer token they present on every `/mcp` request.

### Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/.well-known/oauth-authorization-server` | GET | Server metadata for client discovery |
| `/oauth/authorize` | GET | Begin authorization — requires active user session |
| `/oauth/token` | POST | Exchange authorization code for Bearer token |

### Flow

```
AI Tool (Client)                    Manifold                         User Browser
      │                                 │                                 │
      │── open /oauth/authorize ────────►│                                 │
      │   ?client_id=...                │── redirect to login if ─────────►│
      │   &code_challenge=...           │   no session                     │
      │   &code_challenge_method=S256   │                                 │
      │                                 │◄── user authenticates ───────────│
      │                                 │                                 │
      │                                 │── show consent screen ──────────►│
      │                                 │◄── user approves ────────────────│
      │                                 │                                 │
      │◄── redirect with ?code=... ─────│                                 │
      │                                 │                                 │
      │── POST /oauth/token ────────────►│                                 │
      │   code=...                      │                                 │
      │   code_verifier=...             │                                 │
      │   client_id=...                 │                                 │
      │                                 │                                 │
      │◄── { access_token: "..." } ─────│                                 │
```

### Token storage

Authorization codes are short-lived (10 minutes) and single-use. On exchange:

1. Validate `code_verifier` against the stored `code_challenge` (`BASE64URL(SHA-256(verifier)) === challenge`)
2. Generate a 64-character hex token: `randomBytes(32).toString('hex')`
3. Store `SHA-256(token)` in `oauth_tokens` alongside `userId`, `clientId`, and `expiresAt` (90 days from now)
4. Return the plaintext token once in the response — it is never stored

Subsequent requests present the plaintext token in `Authorization: Bearer`. The gateway hashes it and does a lookup — the plaintext is never written to disk.

### OAuth clients

Admin generates `(clientId, clientSecret)` pairs from the admin settings page. The secret is shown once and stored as a hash. Clients are identified by `clientId` and authenticated by `clientSecret` on the token endpoint.

---

## Credential Encryption

### Algorithm

AES-256-GCM. 256-bit key, 96-bit (12-byte) IV, 128-bit authentication tag.

GCM provides both confidentiality and integrity. The authentication tag is computed over the ciphertext during encryption and verified before decryption. A modified ciphertext — any bit flip, any truncation, any byte substitution — causes decryption to throw before any plaintext is produced.

### Key management

The encryption key is 32 bytes (256 bits) supplied as a 64-character hex string in `ENCRYPTION_KEY`. It is loaded from `src/lib/env.ts` at runtime and kept in process memory. It is never written to the database.

Key rotation is supported at the data-model level. Each ciphertext blob is prefixed with a key version number (`ENCRYPTION_KEY_VERSION`). When a new key is introduced, old blobs remain readable with the old key while new writes use the new key. Re-encryption of old blobs is a manual migration step.

### Stored format

```
{keyVersion}:{ivHex}:{authTagHex}:{ciphertextHex}
```

Example:
```
1:a3f9c2e1b4d5f6a7:8b2e4d6f1c3a5e7b9d0f2a4c:7f3b9c1e5a2d8f4b...
```

A new 12-byte IV is generated for every encryption call. The same plaintext encrypted twice produces different ciphertexts. There is no IV reuse.

### What gets encrypted

The full credential config for a connector is serialised to JSON and encrypted as a single blob. Individual fields are not encrypted separately. When credentials are updated, the full blob is re-encrypted — partial updates are not supported. This prevents partial-credential states where some fields are from a previous configuration.

#### HMAC binding

In addition to AES-256-GCM encryption, each credential blob is protected by an HMAC-SHA256 binding that ties it to its owner context. The HMAC is computed over `userId:connectorId:encryptedBlob` using the encryption key as the HMAC key.

On every credential read, the HMAC is recomputed and compared using a constant-time comparison. This prevents an attacker with direct database write access from swapping one user's encrypted credentials onto another user's row — the HMAC would fail even though the ciphertext itself is valid.

The binding HMAC is stored alongside the encrypted config in `userConnectorConfigs.config_hmac` and `connectorAdminConfigs.config_hmac`.

---

## Connector Discovery

Tools are not listed in the manifest. When a connector is registered, Manifold connects to the connector's MCP endpoint and calls `tools/list` to discover what tools exist.

### At registration

`POST /api/admin/connectors` triggers `connectAndDiscover(endpoint)`:

1. HTTP POST to `connector.endpoint` with JSON-RPC `initialize` request (10-second timeout)
2. HTTP POST with JSON-RPC `tools/list` request
3. Parse and validate the response
4. Store the tool array in `connectors.discoveredTools` (jsonb) and set `toolsDiscoveredAt`

If the endpoint is unreachable, returns an invalid response, or times out — registration is rejected. A connector with an unknown tool list is not stored.

Tool name uniqueness is checked at registration time against all active connectors. If two connectors expose a tool with the same name, the registration fails with a conflict error listing the collision.

### At refresh

`POST /api/admin/connectors/[id]/refresh-tools` re-runs discovery against the live endpoint and updates `discoveredTools` and `toolsDiscoveredAt`. The rest of the connector row is unchanged.

### At request time

The gateway reads `discoveredTools` from the database — it does not call the connector's `tools/list` endpoint on every request. The cached JSON is the source of truth for tool routing. A connector whose endpoint becomes unavailable after registration will still appear in `tools/list` responses until explicitly refreshed or deprecated.

---

## Database Schema

Seven tables. All UUIDs for surrogate keys, kebab-case text for connector IDs (matches the manifest `id` field).

**`users`**
Platform users. `role` is either `member` or `admin`. `lastActiveAt` is updated on every authenticated MCP request. The first user to sign in is assigned `admin` role — this is the bootstrap mechanism for new deployments.

**`connectors`**
The connector registry. One row per registered connector. `manifest` stores the full parsed `manifold.json` as jsonb. `discoveredTools` stores the cached result of the last `tools/list` call. `status` is `pending`, `active`, or `deprecated`. Deprecated connectors are not served to users.

**`connectorPolicies`**
One row per connector. Controls org-wide behaviour: `required` (force-enabled), `visibleToRoles` (which roles see this connector), `disabledTools` (array of tool names to filter out), `rateLimitPerHour` (per-tool call limits). Created with defaults when a connector is registered.

**`userConnectorConfigs`**
One row per (user, connector) pair. `encryptedConfig` is the AES-GCM blob of the user's credentials for that connector. `enabled` tracks whether the user has toggled the connector on. A row with `enabled = false` means the user has previously configured the connector but turned it off.

**`connectorAdminConfigs`**
One row per `admin_managed` connector. Same encrypted blob format as `userConnectorConfigs`. Used when credentials are set once for the whole org rather than per user.

**`oauthTokens`**
Active Bearer tokens. `tokenHash` is `SHA-256(plaintext_token)`. The plaintext is never stored. `expiresAt` is checked on every gateway request. Expired tokens are not automatically purged — they are simply rejected at lookup time and can be cleaned up by a background job.

**`auditLogs`**
Append-only event log. `actorId` is who performed the action. `targetUserId` is set when an admin acts on behalf of a user. `connectorId` is set for connector-related events. `detail` is a jsonb object with event-specific context. Human-readable action strings: `connector.registered`, `connector.deprecated`, `credentials.updated`, `tool.disabled`, etc.

---

## Bundles

Bundles are named sets of connectors that admins assign to users. They solve org-scale provisioning: instead of configuring each user individually, create a "Marketing stack" bundle, add the relevant connectors, and assign it to any new marketing hire.

### Data model

```
bundles:            id, name, description, emoji, createdBy
bundleConnectors:   bundleId, connectorId, required (boolean)
userBundles:        userId, bundleId, assignedBy, assignedAt
```

Each `bundleConnectors` row has a `required` flag. When `required = true`, the connector's toggle is locked in the user's UI — they cannot disable it.

### Assignment behaviour

When an admin assigns a bundle to a user:

- Connectors with `managedBy = 'admin'` or `authType = 'none'` are **auto-provisioned**: Manifold creates or updates the user's `userConnectorConfigs` row with `enabled = true`. The user has immediate access with no action required.
- Connectors with `managedBy = 'user'` are surfaced in the user's connector list with a "via [Bundle Name]" indicator and a setup prompt. The user still enters their own credentials, but the connector is highlighted as part of their role's stack.

### Transparency to the MCP gateway

Bundles do not change the MCP proxy. The gateway reads `userConnectorConfigs` where `enabled = true` — auto-provisioned rows look identical to manually-enabled rows. Bundle logic is entirely in the assignment API and the UI.

### Removal

When a bundle is removed from a user, auto-provisioned connectors (admin-managed, from this bundle and not covered by another active bundle) are disabled. Connectors the user has personally configured are left untouched.

---

## Security Model

### Trust boundaries

- **AI tool → Manifold:** Bearer token required. Token is validated on every request by hash lookup and expiry check. No token, no access. Expired token, no access.
- **User → Manifold (browser):** Google OAuth session via NextAuth. Sessions are HTTP-only cookies. Route middleware enforces authentication and role checks at the framework level.
- **Manifold → connector endpoint:** No authentication on the Manifold side — Manifold trusts the endpoint URL registered by the admin. Credentials are injected per the manifest injection spec. Connector endpoints are expected to validate the injected credentials.
- **Admin actions:** Role check on all `/admin/*` routes and `/api/admin/*` endpoints. Admin-on-behalf-of-user actions are logged with both `actorId` and `targetUserId`.

### What database access gets an attacker

Direct read access to the PostgreSQL database exposes:

- User email addresses and names
- Connector registry (public information — endpoints, manifest structure)
- Audit logs (event history with actor and target IDs)
- `oauthTokens.tokenHash` values — SHA-256 hashes that cannot be reversed to plaintext tokens
- `userConnectorConfigs.encryptedConfig` and `connectorAdminConfigs.encryptedConfig` — AES-256-GCM ciphertexts

The ciphertexts are computationally opaque without the `ENCRYPTION_KEY`. AES-256 with a random 12-byte IV and GCM authentication provides no attack surface for offline decryption at current compute capability.

### What database access plus ENCRYPTION_KEY gets an attacker

Full credential access. All stored configs decrypt. This is the critical secret — `ENCRYPTION_KEY` must be protected with the same care as a root credential. It should never be stored in the database, never committed to source control, and should be supplied via environment variable at runtime (container secret, secrets manager, etc.).

### What a compromised Bearer token gets an attacker

- Access to `tools/list` — visible tool names and descriptions for that user's enabled connectors
- Ability to call `tools/call` for tools that user is authorised to use
- No access to other users' data
- No access to credential plaintext (credentials are decrypted server-side and injected into outbound requests — the AI tool never receives them)

### Secret fields in the UI

When a user views a connector they have already configured, the credential fields render as masked (`••••••••`). The API never returns the plaintext config. The "Change" affordance clears the field for re-entry — the existing encrypted blob is only replaced when the new value is submitted and saved.

---

## Limitations (v1)

**No refresh tokens.** Bearer tokens last 90 days. When a token expires, the AI tool must re-initiate the OAuth flow to obtain a new one. There is no silent renewal.

**In-memory rate limiting.** The per-token rate limiter (100 requests/minute) is stored in the Node.js process. It resets when the process restarts. In a multi-instance deployment, each instance maintains its own counter — the effective limit is `100 * instanceCount`. A persistent rate limiter (Redis, or a DB counter) is required for strict enforcement at scale.

**SSE connection timeout.** Server-sent event connections close after 60 seconds of inactivity. MCP clients are expected to reconnect and re-initialize. This is correct behaviour per the MCP specification but means long-idle connections require client-side reconnect logic.

**Single organisation per deployment.** There is no tenant isolation. One Manifold instance serves one org. All users, connectors, and policies share the same database. Running Manifold for multiple independent organisations requires separate deployments.

**Tool discovery is pull-based.** Manifold does not watch connector endpoints for changes. If a connector adds or removes tools, an admin must manually trigger a refresh. Stale tool lists result in the gateway attempting to route calls to tools that no longer exist on the connector — the connector will return an error.

**No token revocation endpoint.** There is no `/oauth/revoke` endpoint in v1. Tokens can be deleted directly from the admin settings page, which removes the hash from `oauthTokens`. The AI tool will receive 401 on the next request and must re-authorise.

**OAuth codes stored in PostgreSQL.** Authorization codes (the short-lived codes exchanged for tokens) are stored in the database rather than an in-memory or Redis store. Under high concurrency, this creates write contention on the codes table. Acceptable for org-scale deployments; worth revisiting at larger scale.
