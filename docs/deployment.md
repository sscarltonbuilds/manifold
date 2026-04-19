# Deploying Manifold

Self-hosted. Your server, your data, your credentials.

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) 24+
- [Docker Compose](https://docs.docker.com/compose/) v2
- A Google Cloud project with OAuth 2.0 credentials
- A domain name (production only)

---

## Local Development

### 1. Clone and configure

```bash
git clone https://github.com/your-org/manifold.git
cd manifold
cp .env.example .env.local
```

Fill in `.env.local`. See [Environment Variables](#environment-variables) below.

### 2. Start with Docker

```bash
docker compose up
```

This starts the app on `http://localhost:3000` and a PostgreSQL instance. The database is automatically migrated on first run.

### 3. Without Docker

If you prefer to run the app directly:

```bash
pnpm install
pnpm db:migrate
pnpm dev
```

You need a running PostgreSQL instance and a valid `DATABASE_URL` in `.env.local`.

### 4. First sign-in

The first user to sign in with Google becomes admin. No seed script required. This is the only bootstrap path — sign in, and you have full admin access.

### Database commands

| Command | What it does |
|---|---|
| `pnpm db:generate` | Generate migration files from schema changes |
| `pnpm db:migrate` | Apply pending migrations to the database |
| `pnpm db:studio` | Open Drizzle Studio at `https://local.drizzle.studio` |

---

## Environment Variables

All variables are validated at startup via Zod. The app will not start if any required variable is missing or malformed.

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string. Format: `postgresql://user:password@host:5432/manifold` |
| `NEXTAUTH_URL` | Yes | Full URL of the app. E.g. `http://localhost:3000` or `https://mcp.yourdomain.com` |
| `NEXTAUTH_SECRET` | Yes | Random string, 32+ characters. Generate: `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | Yes | OAuth 2.0 client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Yes | OAuth 2.0 client secret from Google Cloud Console |
| `ALLOWED_EMAIL_DOMAIN` | No* | Restricts sign-in to emails at this domain. E.g. `tunga.io` |
| `ALLOWED_EMAILS` | No* | Comma-separated list of specific emails permitted to sign in. E.g. `alice@example.com,bob@example.com` |
| `ENCRYPTION_KEY` | Yes | 64-character hex string (32 bytes). Generate: `openssl rand -hex 32` |
| `ENCRYPTION_KEY_VERSION` | Yes | Starts at `1`. Increment on key rotation. |
| `NEXT_PUBLIC_APP_URL` | Yes | Public URL of the app. Shown in the onboarding MCP URL display. |

*At least one of `ALLOWED_EMAIL_DOMAIN` or `ALLOWED_EMAILS` is required. Both can be set simultaneously.

---

## Google OAuth Setup

### 1. Create a project

Go to [Google Cloud Console](https://console.cloud.google.com/). Create a new project or select an existing one.

### 2. Enable the Google+ API

Navigate to **APIs & Services → Library**. Search for "Google+ API" and enable it.

### 3. Create OAuth 2.0 credentials

Navigate to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**.

- Application type: **Web application**
- Name: `Manifold` (or anything)
- Authorized redirect URIs: `{NEXTAUTH_URL}/api/auth/callback/google`

For local development:

```
http://localhost:3000/api/auth/callback/google
```

For production:

```
https://mcp.yourdomain.com/api/auth/callback/google
```

### 4. Copy the credentials

Copy the **Client ID** and **Client Secret** into your `.env.local` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

---

## Production Deployment

### Docker Compose + Caddy

The production configuration uses the optimised Next.js standalone build with Caddy as a reverse proxy. Caddy handles TLS automatically via Let's Encrypt — no certificate management required.

**Set environment variables on your server:**

```bash
export MANIFOLD_DOMAIN=mcp.yourdomain.com
export POSTGRES_PASSWORD=your-strong-database-password
```

Add all remaining variables to a `.env.local` file on the server. Do not commit this file.

**Start the stack:**

```bash
docker compose -f docker-compose.prod.yml up -d
```

Caddy will obtain a TLS certificate on first request. Your MCP endpoint is live at:

```
https://mcp.yourdomain.com/mcp
```

**SSE and streaming:** Caddy is configured with `flush_interval -1` on the `/mcp` path. This disables response buffering so MCP streaming over SSE works correctly. Do not modify this setting.

---

## Deploying on a VPS

These steps apply to any Linux VPS (Ubuntu 22.04+, Debian 12+, etc.).

### 1. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Clone the repository

```bash
git clone https://github.com/your-org/manifold.git /opt/manifold
cd /opt/manifold
```

### 3. Configure environment

```bash
cp .env.example .env.local
nano .env.local  # fill in all required values
```

Set `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to your production domain.

### 4. Point your domain

Create an A record pointing your domain to your server's IP address. Caddy needs port 80 and 443 open.

### 5. Start

```bash
docker compose -f docker-compose.prod.yml up -d
```

### 6. Verify

```bash
curl https://mcp.yourdomain.com/api/health
```

---

## Upgrading

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec app pnpm db:migrate
```

The build step produces a new image. The migration step applies any schema changes. Both are required on every upgrade that includes database changes — check the release notes.

---

## Health Check

```
GET /api/health
```

Returns `200` when the app and database are healthy:

```json
{
  "status": "ok",
  "db": "ok",
  "version": "1.0.0"
}
```

Returns `503` if the database is unreachable. Use this endpoint for uptime monitoring and load balancer health checks.

---

## Encryption Key Rotation

Manifold encrypts all credentials at rest using AES-256-GCM. The encryption key version is stored as a prefix in every ciphertext — so old data remains decryptable after a key change.

### Rotating the key

**1. Generate a new key:**

```bash
openssl rand -hex 32
```

**2. Update environment variables:**

```bash
ENCRYPTION_KEY=<new 64-char hex key>
ENCRYPTION_KEY_VERSION=2  # increment from previous value
```

**3. Re-encrypt existing data.**

New credentials saved after the restart will use the new key. Existing credentials still use the old key — the version prefix in the ciphertext tells Manifold which key to use for decryption.

To fully rotate (re-encrypt all existing credentials with the new key), write a migration script that:

1. Reads every `encrypted_config` from `user_connector_configs`, `connector_admin_configs`
2. Decrypts each value using the old key (identified by the version prefix)
3. Re-encrypts with the new key and new version prefix
4. Writes the new ciphertext back to the database

Run this script with both the old and new keys available. Once complete, the old key can be retired.

Do not delete the old key until the migration is confirmed complete. Deleting it before re-encryption makes existing credentials unrecoverable.
