# CLI Reference

`@manifold/cli` is the command-line interface for Manifold. It covers the full admin surface: registering connectors, managing users, and revoking tokens — without touching the admin UI.

The binary is `manifold`.

---

## Installation

The CLI is not yet published to npm. Build it from source inside the monorepo.

```bash
cd packages/cli
pnpm install
pnpm build
```

Run without installing globally:

```bash
node dist/index.js --help
```

Or link it globally so `manifold` is available on your PATH:

```bash
npm link
manifold --help
```

---

## Authentication

Every command that talks to a Manifold instance needs a registry URL and an admin token. Three ways to provide them, in order of precedence:

### 1. Stored config (recommended for interactive use)

```bash
manifold login --registry https://mcp.example.com --token <admin-token>
```

Credentials are saved to `~/.config/manifold/config.json`. All subsequent commands use them automatically — no flags required.

### 2. Per-command flags

```bash
manifold connectors ls --registry https://mcp.example.com --token <admin-token>
```

Flags override stored config for that invocation.

### 3. Environment variables (recommended for CI)

```bash
export MANIFOLD_REGISTRY=https://mcp.example.com
export MANIFOLD_TOKEN=<admin-token>

manifold connectors ls
```

Environment variables override stored config but are overridden by explicit flags.

---

## Global Flags

These flags apply to every command.

| Flag | Description |
|---|---|
| `--registry <url>` | Manifold instance URL. Overrides stored config and `MANIFOLD_REGISTRY`. |
| `--token <token>` | Admin API token. Overrides stored config and `MANIFOLD_TOKEN`. |
| `--help` | Print usage for the current command. |

---

## Command Reference

### `manifold login`

Save registry credentials to `~/.config/manifold/config.json`.

```
manifold login --registry <url> --token <token>
```

**Options:**

| Flag | Required | Description |
|---|---|---|
| `--registry <url>` | Yes | Base URL of your Manifold instance. |
| `--token <token>` | Yes | Admin API token generated in the admin settings panel. |

**Example:**

```bash
manifold login --registry https://mcp.example.com --token a1b2c3d4...

# Saved. Registry: https://mcp.example.com
```

---

### `manifold logout`

Remove stored credentials from `~/.config/manifold/config.json`.

```
manifold logout
```

---

### `manifold whoami`

Show the current registry URL and a masked version of the stored token.

```
manifold whoami
```

**Example output:**

```
Registry  https://mcp.example.com
Token     a1b2c3••••••••••••••••••
```

---

### `manifold init`

Scaffold a `manifold.json` in the current directory.

```
manifold init [name]
```

**Arguments:**

| Argument | Required | Description |
|---|---|---|
| `name` | No | Connector ID in kebab-case (e.g. `my-connector`). Defaults to the current directory name. |

Creates `manifold.json` with a complete template pre-filled:

```json
{
  "manifestVersion": "1",
  "id": "my-connector",
  "name": "My Connector",
  "version": "1.0.0",
  "description": "What does this connector do?",
  "endpoint": "https://your-mcp-server.example.com/mcp",
  "auth": {
    "type": "api_key",
    "managed": "user",
    "fields": [
      {
        "key": "apiKey",
        "label": "API Key",
        "description": "Where to find this key",
        "secret": true,
        "required": true,
        "injection": { "method": "header", "name": "X-Api-Key" }
      }
    ]
  }
}
```

Also generates a `README.md` snippet with instructions for submitting to a Manifold instance.

---

### `manifold validate`

Validate `manifold.json` in the current directory, then test live connectivity to the endpoint.

```
manifold validate
```

Steps performed:

1. Reads `manifold.json` from the current directory
2. Validates the schema against the full `ManifestSchema` (same schema used server-side)
3. Connects to `endpoint`, sends `initialize`, then `tools/list`
4. Reports validation result, reachability, and discovered tool count

**Example output — success:**

```
manifold.json   Valid
Endpoint        https://pipedrive-mcp.example.com/mcp
Reachable       Yes
Tools           8 discovered
```

**Example output — failure:**

```
manifold.json   Invalid
  - auth.fields[0].injection: Required
Endpoint        —
```

No flags required. Connectivity test does not need a registry — it calls the endpoint directly.

---

### `manifold publish`

Validate `manifold.json` and submit it to the registry.

```
manifold publish [--registry <url>] [--token <token>]
```

**Options:**

| Flag | Required | Description |
|---|---|---|
| `--registry <url>` | If not stored | Manifold instance URL. |
| `--token <token>` | If not stored | Admin API token. |

Steps performed:

1. Reads and validates `manifold.json` locally
2. POSTs to `POST /api/admin/connectors` with the manifest as the request body
3. Manifold runs tool discovery server-side against the endpoint
4. Reports the outcome

**Example output — success:**

```
Connector   pipedrive
Tools       8 discovered
Status      active

Registered. Users can now enable Pipedrive from the connectors panel.
```

**Example output — failure:**

```
Error   Connector ID "pipedrive" is already registered.
```

---

### `manifold connectors ls`

List all connectors in the registry.

```
manifold connectors ls [--registry <url>] [--token <token>]
```

**Example output:**

```
ID              NAME          VERSION   STATUS       TOOLS   USERS
pipedrive       Pipedrive     1.0.0     active       8       12
google-drive    Google Drive  2.1.0     active       5       9
twist           Twist         1.0.0     pending      0       0
```

---

### `manifold connectors get`

Show full details for a single connector.

```
manifold connectors get <id> [--registry <url>] [--token <token>]
```

**Arguments:**

| Argument | Required | Description |
|---|---|---|
| `id` | Yes | Connector ID (e.g. `pipedrive`). |

**Example output:**

```
ID          pipedrive
Name        Pipedrive
Version     1.0.0
Status      active
Endpoint    https://pipedrive-mcp.example.com/mcp
Auth        api_key (user-managed)
Tools       8
Discovered  2026-04-18 14:32 UTC

Tools:
  pipedrive_list_deals
  pipedrive_get_deal
  pipedrive_create_deal
  pipedrive_update_deal
  pipedrive_list_contacts
  pipedrive_get_contact
  pipedrive_list_activities
  pipedrive_add_note
```

---

### `manifold connectors refresh`

Re-run tool discovery for a connector. Calls `tools/list` on the endpoint and updates the stored tool list.

```
manifold connectors refresh <id> [--registry <url>] [--token <token>]
```

**Arguments:**

| Argument | Required | Description |
|---|---|---|
| `id` | Yes | Connector ID. |

**Example output:**

```
Connector   pipedrive
Tools       9 discovered (was 8)
Updated     2026-04-19 09:01 UTC
```

---

### `manifold connectors deprecate`

Mark a connector as deprecated. It remains in the registry but is hidden from users and skipped by the gateway.

```
manifold connectors deprecate <id> [--registry <url>] [--token <token>]
```

**Arguments:**

| Argument | Required | Description |
|---|---|---|
| `id` | Yes | Connector ID. |

Prompts for confirmation before proceeding.

---

### `manifold users ls`

List all users.

```
manifold users ls [--registry <url>] [--token <token>]
```

**Example output:**

```
NAME              EMAIL                    ROLE     CONNECTORS   LAST ACTIVE
Alice Nakamura    alice@example.com        admin    4            2026-04-19
Ben Osei          ben@example.com          member   2            2026-04-18
Cleo Hartmann     cleo@example.com         member   0            —
```

---

### `manifold users set-role`

Change a user's role.

```
manifold users set-role <email> <role> [--registry <url>] [--token <token>]
```

**Arguments:**

| Argument | Required | Description |
|---|---|---|
| `email` | Yes | User's email address. |
| `role` | Yes | `admin` or `member`. |

**Example:**

```bash
manifold users set-role ben@example.com admin

# ben@example.com → admin
```

The server rejects attempts to remove admin role from the last remaining admin.

---

### `manifold tokens ls`

List active (non-expired) OAuth tokens.

```
manifold tokens ls [--registry <url>] [--token <token>]
```

**Example output:**

```
ID                                    CLIENT         USER                   EXPIRES
3f8a1c2d-...                          claude-desktop alice@example.com      2026-07-18
a9b4e6f0-...                          claude-desktop ben@example.com        2026-07-15
```

Expired tokens are not shown.

---

### `manifold tokens revoke`

Revoke an OAuth token immediately.

```
manifold tokens revoke <id> [--registry <url>] [--token <token>]
```

**Arguments:**

| Argument | Required | Description |
|---|---|---|
| `id` | Yes | Token ID from `manifold tokens ls`. |

The affected user's MCP client will receive a 401 on their next request and must re-authorise.

---

## Common Workflows

### Connector developer: build and publish

```bash
# 1. Scaffold a manifest in your connector's repo
cd my-mcp-server
manifold init my-connector

# 2. Edit manifold.json — set endpoint, auth fields, description

# 3. Validate schema and test connectivity against your running server
manifold validate

# 4. Publish to your organisation's Manifold instance
manifold publish --registry https://mcp.example.com --token <token>
```

Once published, users can enable the connector immediately from the connectors panel.

---

### Admin: inspect and refresh a connector

```bash
# Authenticate once
manifold login --registry https://mcp.example.com --token <token>

# See what's registered
manifold connectors ls

# Inspect a specific connector
manifold connectors get pipedrive

# Connector updated its tools — pull the latest list
manifold connectors refresh pipedrive
```

---

### CI/CD: publish on merge to main

Add to your deployment pipeline. No stored config required — credentials come from CI secrets.

```yaml
# Example: GitHub Actions
- name: Publish connector
  env:
    MANIFOLD_REGISTRY: ${{ secrets.MANIFOLD_REGISTRY }}
    MANIFOLD_TOKEN: ${{ secrets.MANIFOLD_TOKEN }}
  run: |
    cd packages/cli
    pnpm build
    node dist/index.js publish
```

`manifold publish` exits with code `0` on success and non-zero on any error, so the pipeline step fails cleanly if registration fails.

---

## Config File

Stored credentials live at `~/.config/manifold/config.json`.

```json
{
  "registry": "https://mcp.example.com",
  "token": "a1b2c3d4e5f6..."
}
```

The file is created by `manifold login` and removed by `manifold logout`. Do not commit it to version control.
