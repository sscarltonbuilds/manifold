# Connectors

Manifold has no built-in connectors. It is a pure gateway — authentication, credential storage, and routing. Connectors are external MCP servers that you build and host, described to Manifold via a `manifold.json` manifest file.

This document covers everything you need to write a connector and register it with a Manifold instance.

---

## Overview

A **connector** is an external MCP server that exposes tools over JSON-RPC 2.0. Manifold does not run connector code. It holds the manifest, stores encrypted credentials, and proxies tool calls.

The relationship:

1. You write and host an MCP server at a stable URL (e.g. `https://pipedrive-mcp.example.com/mcp`)
2. You describe it with a `manifold.json` manifest
3. An admin registers the manifest with Manifold
4. Manifold calls `tools/list` on your endpoint and caches the result
5. Users enable the connector and enter credentials in the Manifold UI
6. When a user calls a tool, Manifold resolves their identity, decrypts their credentials, injects them per your manifest's spec, and forwards the request to your endpoint

Your MCP server never handles auth. Manifold handles auth. Your server receives requests with credentials already injected — it just needs to accept them.

---

## The manifold.json Format

Every connector is described by a single `manifold.json` file. This is the contract between your connector and the Manifold platform.

```json
{
  "manifestVersion": "1",
  "id": "pipedrive",
  "name": "Pipedrive",
  "version": "1.0.0",
  "description": "Access deals, leads, and contacts from Pipedrive.",
  "icon": "https://example.com/pipedrive-icon.svg",
  "endpoint": "https://pipedrive-mcp.example.com/mcp",
  "auth": {
    "type": "api_key",
    "managed": "user",
    "fields": [
      {
        "key": "apiToken",
        "label": "API Token",
        "description": "Found in Pipedrive → Settings → Personal preferences → API",
        "docsUrl": "https://support.pipedrive.com/en/article/how-can-i-find-my-personal-api-key",
        "secret": true,
        "required": true,
        "injection": { "method": "header", "name": "X-Pipedrive-Token" }
      }
    ]
  }
}
```

### Field Reference

| Field | Type | Required | Description |
|---|---|---|---|
| `manifestVersion` | `"1"` | Yes | Always `"1"`. Used for future versioning. |
| `id` | string | Yes | Unique connector identifier. Lowercase, alphanumeric, hyphens only (e.g. `pipedrive`, `google-drive`). Must be unique across the Manifold instance. |
| `name` | string | Yes | Human-readable connector name shown in the UI. |
| `version` | string | Yes | Connector version. Semver recommended (e.g. `1.0.0`). |
| `description` | string | Yes | One or two sentences describing what the connector provides. Shown in the UI. |
| `icon` | string (URL) | No | URL to an SVG or PNG icon. Displayed in the connector card. |
| `endpoint` | string (URL) | Yes | The MCP server URL. Manifold sends all JSON-RPC requests here. |

> **Tip:** If your connector doesn't include an icon in its manifest, an admin can set one later from the connector's detail page (Admin → Connectors → [connector] → Overview → Icon).
| `auth` | object | Yes | Authentication configuration. See [Auth Types](#auth-types). |

---

## Auth Types

The `auth` field describes how Manifold should collect and inject credentials for this connector.

### `api_key`

One or more API keys injected into each request as headers or query parameters.

```json
{
  "type": "api_key",
  "managed": "user",
  "fields": [
    {
      "key": "apiToken",
      "label": "API Token",
      "description": "Found in your account settings under API.",
      "docsUrl": "https://docs.example.com/api-keys",
      "secret": true,
      "required": true,
      "injection": { "method": "header", "name": "X-Api-Token" }
    }
  ]
}
```

`managed` controls who enters credentials:

- `"user"` — each user enters their own credentials in the Manifold UI
- `"admin"` — an admin enters one set of credentials used for all users of this connector

`fields` is an array of credential fields. Each field:

| Field | Type | Required | Description |
|---|---|---|---|
| `key` | string | Yes | Internal identifier for this field. Used as the key when storing and injecting the value. |
| `label` | string | Yes | Field label shown in the UI. |
| `description` | string | No | Helper text shown below the field. |
| `docsUrl` | string (URL) | No | Link to documentation about where to find this value. |
| `secret` | boolean | Yes | If `true`, the field is masked in the UI and never returned in plaintext after save. |
| `required` | boolean | Yes | If `true`, the connector cannot be enabled without this field. |
| `type` | `"text"` \| `"password"` \| `"url"` | No | Input type hint. Defaults to `"text"`. Use `"password"` for secrets. |
| `injection` | object | No | How to inject this value into requests. See [Credential Injection](#credential-injection). |

### `oauth2`

Manifold handles the OAuth 2.0 flow. Users authorise via the third-party service; Manifold stores and refreshes the access token.

```json
{
  "type": "oauth2",
  "managed": "user",
  "authorizeUrl": "https://app.example.com/oauth/authorize",
  "tokenUrl": "https://app.example.com/oauth/token",
  "scopes": ["read:deals", "read:contacts"],
  "adminNote": "Requires a Pipedrive Developer account to create an OAuth app."
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `managed` | `"user"` \| `"admin"` | Yes | Whether each user authorises individually or an admin authorises once for the org. |
| `authorizeUrl` | string (URL) | Yes | The OAuth 2.0 authorization endpoint. |
| `tokenUrl` | string (URL) | Yes | The OAuth 2.0 token endpoint. |
| `scopes` | string[] | Yes | Scopes to request. |
| `adminNote` | string | No | Setup instructions shown to the admin. Use for app registration requirements or OAuth app prerequisites. |

### `bearer_token`

A single opaque token injected as an `Authorization: Bearer` header. Simpler than `api_key` when only one token is needed and no custom header name is required.

```json
{
  "type": "bearer_token",
  "managed": "user",
  "fields": [
    {
      "key": "token",
      "label": "Access Token",
      "secret": true,
      "required": true
    }
  ]
}
```

The `fields` array follows the same schema as `api_key`. Omit `injection` — the value is always injected as `Authorization: Bearer {token}`.

### `admin_managed`

No per-user credentials. An admin enters one set of credentials for the entire organisation. Users can enable the connector without configuring anything.

```json
{
  "type": "admin_managed"
}
```

Use this for shared service accounts, internal APIs, or any connector where individual user credentials are not meaningful.

### `none`

No credentials. The connector endpoint is open or handles authentication independently.

```json
{
  "type": "none"
}
```

---

## Credential Injection

The `injection` field on each auth field specifies how Manifold injects the credential into outbound requests to your MCP endpoint.

### Header injection

```json
{ "method": "header", "name": "X-Api-Key" }
```

Adds the value as an HTTP request header:

```
X-Api-Key: <value>
```

### Query parameter injection

```json
{ "method": "query", "name": "api_key" }
```

Appends the value to the request URL:

```
https://your-endpoint.example.com/mcp?api_key=<value>
```

### Bearer injection

```json
{ "method": "bearer" }
```

Adds the value as an Authorization header:

```
Authorization: Bearer <value>
```

If a connector has multiple fields, each can have its own injection spec. Manifold injects all fields on every proxied request.

---

## Tool Discovery

Tools are not listed in `manifold.json`. Manifold discovers them automatically.

At registration time, Manifold connects to your endpoint and sends:

1. An `initialize` request
2. A `tools/list` request

The response is stored in the database and shown in the admin panel. Users see the combined tool list from all their enabled connectors when they call `tools/list` via the MCP gateway.

Discovery runs once at registration. To update the tool list after you add or remove tools from your MCP server, refresh from the admin panel or via the CLI:

```bash
manifold connectors refresh <connector-id>
```

If your endpoint is unreachable or returns an invalid response at registration time, the registration is rejected. Manifold will not register a connector with no tools.

### Built-in Manifold tool

Manifold adds one tool to every user's `tools/list` regardless of their enabled connectors:

**`manifold_list_connectors`** — returns all connectors available in the org with per-user enabled/configured status and a `setupUrl`. AI tools use this to understand what integrations exist but haven't been configured yet, and to direct users to enable what they need.

This tool is always present and cannot be disabled. It is answered directly by Manifold — no connector endpoint is involved.

---

## Registering a Connector

Three ways to register a connector with a Manifold instance.

### Admin UI

1. Open the admin panel → **Connectors** → **Add Connector**
2. Paste a URL pointing to your hosted `manifold.json`, or paste the raw JSON directly
3. Manifold fetches, validates, and runs tool discovery
4. The connector appears as active in the registry

### CLI

```bash
manifold publish --registry https://your-manifold.example.com --token <admin-token>
```

Run this from the directory containing your `manifold.json`. The CLI validates the manifest locally before submitting.

### API

```http
POST /api/admin/connectors
Authorization: Bearer <admin-token>
Content-Type: application/json

{ "manifestUrl": "https://your-server.example.com/manifold.json" }
```

Or submit the manifest directly:

```http
POST /api/admin/connectors
Authorization: Bearer <admin-token>
Content-Type: application/json

{ "manifest": { ... } }
```

On success, the response includes the connector ID and the number of tools discovered.

---

## Writing Your MCP Server

Your MCP server must implement the [MCP specification](https://spec.modelcontextprotocol.io) over JSON-RPC 2.0 via HTTP POST. The minimum required methods:

- `initialize` — respond with server info and capabilities
- `tools/list` — return the full list of tools your server exposes

Tool calls arrive as `tools/call` requests with the tool name and arguments. Manifold forwards the request exactly as received, with credentials injected per your manifest's injection spec.

Your server does not need to handle authentication. By the time a request reaches your endpoint, Manifold has already validated the user's Bearer token, checked that the connector is enabled for that user, and injected their credentials. Accept the injected headers or query parameters and use them to call your upstream service.

A minimal `tools/list` response:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "pipedrive_list_deals",
        "description": "List deals from Pipedrive.",
        "inputSchema": {
          "type": "object",
          "properties": {
            "limit": { "type": "number", "description": "Max results to return." }
          }
        }
      }
    ]
  }
}
```

---

## Validation

Before publishing, validate your manifest and test endpoint connectivity:

```bash
manifold validate
```

Run from the directory containing your `manifold.json`. This command:

1. Validates the manifest against the `ManifestSchema`
2. Connects to the `endpoint` URL
3. Sends `initialize` and `tools/list`
4. Reports validation result, reachability, and tool count

Fix all errors before running `manifold publish`. Manifold will reject a manifest that fails validation or a connector whose endpoint does not respond correctly.

---

## Updating a Connector

**Refresh tools** after adding or removing tools from your MCP server:

- Admin UI: Connector detail → **Tools** tab → **Refresh**
- CLI: `manifold connectors refresh <connector-id>`

**Update the manifest** (endpoint URL, auth config, description) via the admin UI connector detail page or the API:

```http
PATCH /api/admin/connectors/<id>
```

**Deprecate a connector** to remove it from users' tool lists without deleting data:

- Admin UI: Connector detail → **Overview** tab → **Deprecate**
- CLI: `manifold connectors deprecate <connector-id>`

Deprecated connectors are hidden from users. Existing `userConnectorConfig` rows are retained. The connector can be reactivated by an admin.

---

## Tool Name Uniqueness

Tool names must be unique across all active connectors registered with a Manifold instance. Manifold rejects a connector registration if any of its tools conflict with tools from an already-active connector.

**Convention:** prefix all tool names with the connector ID.

```
pipedrive_list_deals
pipedrive_get_deal
pipedrive_create_lead
google_drive_list_files
google_drive_get_file
```

This prevents conflicts and makes it immediately clear which connector a tool belongs to when reviewing tool lists or audit logs.
