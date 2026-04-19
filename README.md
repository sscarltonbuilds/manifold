# Manifold

**One endpoint. Every connector.**

Manifold is a self-hosted MCP (Model Context Protocol) access management platform for teams. It acts as a single authenticated gateway in front of your MCP servers — so your team gets one URL, one login, and a clean UI to manage their own connector credentials.

```
Your AI tool  →  manifold.yourdomain.com/mcp  →  Pipedrive MCP server
                                               →  Trello MCP server
                                               →  Google Drive MCP server
```

No config files. No shared API keys. Full admin visibility.

---

## What it does

- **Single MCP endpoint** for your whole org — paste one URL into your AI tool's settings
- **Google SSO** — team members sign in with their work account, no passwords
- **Connector registry** — admins register external MCP servers via a `manifold.json` manifest
- **Per-user credentials** — each person enters their own API keys; Manifold encrypts and stores them
- **Admin governance** — disable tools, set rate limits, force-enable connectors, manage on behalf of users
- **OAuth 2.1 / PKCE** — issues Bearer tokens to MCP clients following the standard auth flow
- **Audit log** — every credential change, connector toggle, and role change recorded

Manifold has no built-in connectors. It is a pure auth and routing layer. Your MCP servers live wherever they live.

---

## Quick start

```bash
# Clone and configure
git clone https://github.com/your-org/manifold.git
cd manifold
cp .env.example .env.local
# edit .env.local — see docs/deployment.md

# Start
docker compose up
```

Open `http://localhost:3000`. Sign in with Google — the first user becomes admin.

---

## Documentation

- [Deployment](docs/deployment.md) — Docker, environment variables, production setup
- [Connecting your AI tool](docs/mcp-setup.md) — Adding Manifold as an MCP source
- [Writing connectors](docs/connectors.md) — `manifold.json` format, auth types, publishing
- [CLI reference](docs/cli.md) — `manifold` command-line tool
- [Architecture](docs/architecture.md) — How the proxy works, security model

---

## Tech stack

Next.js 15 · TypeScript · PostgreSQL · Drizzle ORM · NextAuth v5 · AES-256-GCM · Docker

---

## Licence

MIT
