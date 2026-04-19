# Manifold — Technical Execution Plan
**For Claude Code | Personal Side Project | Carlton Sserunkuma**

---

## Project Overview

You are building **Manifold** — a self-hosted MCP (Model Context Protocol) connector management platform. It is a web application that lets an organisation's team members connect their AI tools (Claude, any MCP-compatible client) to services like Trello, Twist, Google Drive, and Pipedrive — without touching config files or API keys directly.

An admin manages the connector registry. Users log in, toggle connectors on, fill in credentials once, and get instant access. The platform acts as a multi-tenant OAuth 2.0 gateway and MCP server simultaneously.

This is a personal project. Design quality is not negotiable. Read this entire document before writing a single line of code.

---

## Brand Identity — Manifold

### The Name

A manifold in engineering is a component that takes a single source and distributes it to multiple outputs — or collects from multiple inputs into one. In mathematics, a manifold is a space that appears simple locally but can be complex globally. Both meanings apply precisely: one endpoint, every connector. Elegant complexity, packaged simply.

### Personality

Manifold is a precision instrument. It's the kind of tool that rewards the person who picks it up — powerful without announcing it, beautiful because it's well-made, not because it's decorated.

Four words: **Precise. Distributed. Warm. Confident.**

Think: high-end audio equipment. A Leica camera. A well-machined mechanical keyboard. Technical credibility with warmth. Never cold, never corporate, never trying too hard.

### Voice & Copy Tone

- Declarative, not explanatory. State what it does; don't justify it.
- Precise language. Use correct technical terms but never show off.
- Short. If it can be said in four words, don't use eight.
- Human. This is a tool built by someone who cares, not a product marketed by a committee.

**Examples:**
- ✅ "One endpoint. Every connector." — not "Seamlessly connect all your tools in one unified platform"
- ✅ "Sign in" — not "Get started for free today"
- ✅ "4 tools · Configured" — not "This connector is fully set up and ready to use"
- ✅ "Your team's AI connectors, in one place." — exactly that length, no more

### Logo Mark

An SVG branching junction: a single amber circle at the top (the platform — the source), a vertical line splitting into three downward paths, each terminating in a subdued circle (the connectors). The top node is `#C4853A` (Amber). The output nodes and paths are `#9C9890` (Subdued). This literally depicts what the product does.

The wordmark: `MANIFOLD` in uppercase, `fontWeight: 700`, `letterSpacing: "0.12em"`. Always paired with the mark at equal optical weight.

---

## Design System

### Colour Palette

These are the only colours in Manifold. Do not introduce others.

```
Obsidian:   #0D0D0B   Primary dark surface — near-black with warm undertone
Parchment:  #F5F4F0   Primary light surface — warm off-white, like quality paper
Amber:      #C4853A   Primary accent — copper warmth, precision instrument energy
Amber Lt:   #E8A855   Hover/active states on amber elements
Ink:        #1A1917   Dark card surface, dark body text on light backgrounds
Warm Grey:  #6B6966   Secondary text, labels, metadata
Subdued:    #9C9890   Tertiary text, disabled states, inactive marks
Dk Border:  #2A2926   Borders on dark surfaces
Lt Border:  #E3E1DC   Borders on light surfaces
Warm White: #F0EFE9   Body text on dark surfaces
Success:    #4A7C59   Enabled/active state indicator (muted green — not bright)
Error:      #A3352B   Error state (muted red — not alarming)
```

In Tailwind, add these as custom colours in `tailwind.config.ts` under `theme.extend.colors`.

In component files, define as constants at the top — never hardcode hex values inline:

```typescript
const OBSIDIAN  = "#0D0D0B"
const PARCHMENT = "#F5F4F0"
const AMBER     = "#C4853A"
const AMBER_LT  = "#E8A855"
const INK       = "#1A1917"
const WARM_GREY = "#6B6966"
const SUBDUED   = "#9C9890"
const DK_BORDER = "#2A2926"
const LT_BORDER = "#E3E1DC"
const WARM_WH   = "#F0EFE9"
```

### Typography

**Font stack:**
- UI text, labels, body: `Geist` (via `next/font/google`) — clean, precise, modern
- Monospace (tokens, URLs, API keys, code snippets): `Geist Mono`
- No serif. No mixed font stacks. Two fonts, used consistently.

**Scale:**
```
Display:   36–42px  weight 300  tracking -0.02em  (page heroes, empty state headlines)
Heading:   22–28px  weight 400  tracking -0.01em  (page titles, section headers)
Subhead:   16–18px  weight 500  tracking  0       (card titles, form section labels)
Body:      13–14px  weight 400  tracking  0       (descriptions, metadata, UI copy)
Label:     11–12px  weight 600  tracking  0.08em  (status badges, eyebrows, tab labels — UPPERCASE)
Mono:      11–13px  weight 400  (Geist Mono — tokens, URLs, technical values only)
```

**Key rule:** Weight carries hierarchy, not size alone. A 14px medium label outranks a 28px light display when it needs to.

### Surface Hierarchy

Two modes — dark and light — applied consistently per context:

**Dark surfaces** (sidebar, login screen, hero areas, admin badge):
- Background: `Obsidian`
- Card/elevated: `Ink`
- Text: `Warm White`
- Secondary text: `Subdued`
- Border: `Dk Border`
- Accent: `Amber`

**Light surfaces** (main content area, config panels, tables):
- Background: `Parchment`
- Card/elevated: `#FFFFFF`
- Text: `Ink`
- Secondary text: `Warm Grey`
- Border: `Lt Border`
- Accent: `Amber`

The sidebar is always dark. The content area is always light. This contrast is the core spatial grammar of the UI.

### Texture

Dark surfaces only: a subtle dot grid using `radial-gradient`:

```css
background-image: radial-gradient(circle at 1px 1px, #2A2926 1px, transparent 0);
background-size: 32px 32px;
opacity: 0.6;
```

This is Manifold's signature texture — engineering graph paper. Use it on: login screen background, sidebar background, hero sections. Never on light surfaces.

### Motion

```
Micro (hover, toggle, button):     150ms  ease-out
Panel/sheet (slide in from right): 220ms  ease-out
Modal:                             200ms  ease-out
Page transition:                   0ms    (instant — no page fade)
Skeleton loading pulse:            1.5s   ease-in-out  infinite
```

Nothing bounces. Nothing springs. Transitions feel like a precision mechanism engaging — smooth, certain, final.

### Component Patterns

**Toggle (connector enable/disable):**
- On: `Amber` track, white knob, right position
- Off: `#3A3836` track (dark off-state), white knob, left position
- Transition: 150ms on both track colour and knob position

**Status badge:**
- Active: `Success` text on `#EBF5EF` background (light surfaces) or `Success` text on `#1A2E1F` (dark surfaces)
- Beta: `Amber` text on `#2E2618` background
- Not configured: `Subdued` text on `#2A2926` background
- Always: `border-radius: 20px`, `padding: 3px 8px`, `font-size: 11px`, `font-weight: 600`, `letter-spacing: 0.06em`, `text-transform: uppercase`

**Connector card:**
- Light surface background, `Lt Border` border, `border-radius: 10px`
- Icon container: `Ink` background, `border-radius: 8px`, 40×40px, connector icon in `Amber` stroke
- Hover: `box-shadow: 0 2px 8px rgba(0,0,0,0.06)`, subtle lift

**Monospace values** (API tokens, MCP URLs, config values):
- `Geist Mono`, `font-size: 12px`
- Dark surface: `Amber` text on `Ink` background, `border-radius: 6px`, `padding: 6px 10px`
- Light surface: `Amber` text on `#1A1917` background, same treatment

**Buttons:**
- Primary: `Amber` background, `Ink` text, `border-radius: 8px`, `font-weight: 600`
- Secondary: white background, `Ink` border + text, same radius
- Destructive: `Error` background, white text
- Ghost/text: no background, `Warm Grey` text, underline on hover
- All buttons: `transition: background 150ms ease-out`

**Forms:**
- Input: white background, `Lt Border` border, `border-radius: 8px`
- Focus: `Amber` border (not blue — keep it in palette)
- Secret/password fields: lock icon left, masked by default, "Change" text link to reveal input
- Never return plaintext secret values to the UI after save

**Sheets (config panel):**
- Slides in from right, 420px wide
- Overlay: `rgba(0,0,0,0.4)` backdrop
- Background: `Parchment`
- Header: connector name + icon, `Lt Border` bottom border
- Close: × icon top-right, `Warm Grey`, hover `Ink`

### What Manifold Never Does

- Uses blue as an accent (that's Helm — Manifold is amber)
- Uses pure black (`#000000`) or pure white (`#FFFFFF`) — always the warm-tinted versions
- Adds decorative illustrations or abstract blobs
- Uses gradients on content surfaces (only allowed as very subtle depth shadows)
- Shows spinners that spin indefinitely — always timeout with a clear error state
- Writes copy that hedges: no "try", "might", "could", "feel free to"
- Uses rounded corners larger than `border-radius: 12px` on containers (cards are 10px, panels 12px, modals 16px)

---

## Design Philosophy (Non-Negotiable)

These principles apply to every UI decision across every module.

**Monochromatic with intent.** The palette is Obsidian, Parchment, and Amber. That's it. No rainbow dashboards.

**Typography does the work.** Headlines are large and light-weight. Body text is small and precise. Nothing fights for attention.

**State as design.** Every interactive element communicates its state — enabled, disabled, loading, error, success — without relying on colour alone. Use weight, opacity, and motion.

**Motion is furniture.** Transitions should feel like objects settling into place, not animations performing. 150ms ease-out for state changes. 200–250ms for panels and modals. Nothing bounces.

**Density done right.** Manifold is not sparse — it's precisely dense. Tables are tight. Forms are structured. But there is always enough air that nothing feels crowded. Achieve this with precise padding, not large gaps.

**Icons are Lucide.** Use the `lucide-react` icon set throughout. Consistent stroke width, no mixing icon libraries.

---

## What Manifold Is (Architecture North Star)

Manifold is not an MCP server. It is the **authentication and access management layer** that sits in front of MCP servers.

Without Manifold, a team of 20 people using Claude with three connectors means 60 individual credential setups — all fragile, all invisible to admin, all inaccessible to non-technical users.

With Manifold: one URL in Claude org settings, configured once. Every user authorises with Google. They toggle connectors on in a clean UI. Credentials are stored encrypted on the Manifold server. Admin has full visibility and control.

**Manifold has no built-in connectors.** It is a pure gateway. MCP servers live wherever they live — a developer's server, Fly.io, Railway, Zapier, Composio, anywhere. Manifold handles identity, credential storage, and routing. The MCP server handles tools.

**The flow for a tool call:**
1. User calls `pipedrive_list_deals` via Claude
2. Manifold validates their Bearer token → resolves their identity
3. Looks up their Pipedrive config → decrypts their API token
4. Forwards the MCP request to the connector's endpoint with the token injected
5. Returns the response

Manifold is the auth and routing layer. The connector server does the work.

---

## Tech Stack

These decisions are final. Do not substitute without a documented reason.

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | Full-stack, API routes, RSC, streaming |
| Language | TypeScript (strict mode) | Throughout — no JS files |
| Styling | Tailwind CSS v4 | Utility-first, co-located with components |
| Components | shadcn/ui (heavily customised) | Good primitives, full control |
| ORM | Drizzle ORM | TypeScript-first, SQL-close, fast |
| Database | PostgreSQL 16 | As per architecture plan |
| Auth | NextAuth.js v5 (Auth.js) | Google provider, session management |
| Validation | Zod | All API boundaries and config schemas |
| MCP Protocol | Custom implementation | JSON-RPC 2.0 over HTTP + SSE |
| Encryption | Node.js `crypto` module | AES-256-GCM, no external dep |
| Package Manager | pnpm | Workspace support, fast |
| Runtime | Node.js 20 LTS | Stable, Docker-friendly |
| Containerisation | Docker + Docker Compose | Local dev + production parity |
| Font | Geist + Geist Mono | Via `next/font/google` |


## Repository Structure

Initialise the project with this exact structure. Every directory exists for a reason.

```
/
├── CLAUDE.md                    # This file — always read first
├── docker-compose.yml           # Local dev: app + postgres
├── docker-compose.prod.yml      # Production: app + postgres + reverse proxy
├── Dockerfile
├── .env.example                 # All required env vars documented, no secrets
├── .env.local                   # Gitignored — actual secrets
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── tailwind.config.ts
├── drizzle.config.ts
│
├── src/
│   ├── app/
│   │   ├── (marketing)/         # Public-facing pages (no auth required)
│   │   │   ├── page.tsx         # Homepage — sells the value prop
│   │   │   └── layout.tsx
│   │   ├── (auth)/
│   │   │   └── login/
│   │   ├── (app)/               # Authenticated app shell
│   │   │   ├── layout.tsx       # Sidebar + nav
│   │   │   ├── connectors/      # User connector management
│   │   │   └── settings/
│   │   ├── admin/               # Admin-only routes
│   │   │   ├── layout.tsx
│   │   │   ├── connectors/      # Registry management + approval queue
│   │   │   ├── users/
│   │   │   └── settings/
│   │   ├── onboarding/          # First-run wizard (admin only)
│   │   │   └── page.tsx
│   │   ├── oauth/               # OAuth 2.0 server endpoints
│   │   │   ├── authorize/
│   │   │   └── token/
│   │   ├── mcp/
│   │   │   └── route.ts         # Single MCP proxy endpoint: /mcp
│   │   ├── api/
│   │   │   ├── connectors/      # Registry API + manifest submission
│   │   │   ├── admin/
│   │   │   └── health/
│   │   └── layout.tsx
│   │
│   ├── components/
│   │   ├── ui/                  # shadcn/ui primitives
│   │   ├── connectors/          # Connector cards, config sheets, toggles
│   │   ├── admin/               # Admin tables, approval queue, fine controls
│   │   ├── onboarding/          # First-run wizard steps
│   │   └── shared/              # Nav, sidebar, user menu
│   │
│   ├── lib/
│   │   ├── auth.ts              # NextAuth config
│   │   ├── env.ts               # Zod-validated env vars — import this, not process.env
│   │   ├── db/
│   │   │   ├── index.ts         # Drizzle client
│   │   │   ├── schema.ts        # All tables
│   │   │   └── migrations/
│   │   ├── crypto.ts            # AES-256-GCM encrypt/decrypt
│   │   ├── oauth.ts             # OAuth 2.0 server logic
│   │   ├── manifest.ts          # Manifest parsing, validation, Zod schema
│   │   ├── mcp/
│   │   │   ├── proxy.ts         # Core proxy logic — forwards requests to connector endpoints
│   │   │   ├── discovery.ts     # Calls tools/list on a connector endpoint to discover tools
│   │   │   └── types.ts         # MCP protocol types (JSON-RPC 2.0)
│   │   └── utils.ts
│   │
│   └── types/
│       ├── index.ts
│       └── next-auth.d.ts
│
├── packages/
│   └── cli/                     # @manifold/cli — Module 10
│       ├── package.json
│       ├── src/
│       │   ├── index.ts         # CLI entry point
│       │   ├── commands/
│       │   │   ├── init.ts
│       │   │   ├── validate.ts
│       │   │   ├── publish.ts
│       │   │   └── list.ts
│       │   └── manifest.ts      # Shared manifest types (mirrors src/lib/manifest.ts)
│       └── tsconfig.json
│
└── scripts/
    └── seed.ts                  # Create first admin user
```

There is no `src/connectors/` directory. Manifold has no built-in connector code. Connectors are external MCP servers described by manifests stored in the database.

---

## The Manifold Manifest Format

Every connector is described by a `manifold.json` file. This is the contract between a connector developer and the Manifold platform.

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

**Auth types:**

| type | Meaning |
|---|---|
| `api_key` | One or more API keys, injected as headers or query params |
| `oauth2` | OAuth 2.0 — Manifold handles the flow, stores tokens |
| `bearer_token` | Single opaque token, injected as Authorization header |
| `admin_managed` | No per-user credentials — admin enters one set for the whole org |
| `none` | No credentials — connector endpoint is open or handles auth itself |

**Credential injection (`injection` field):**

```json
{ "method": "header", "name": "X-Api-Key" }          // Authorization header
{ "method": "query",  "name": "api_key" }             // Query parameter
{ "method": "bearer" }                                 // Authorization: Bearer {token}
```

**Tool discovery:** Tools are NOT listed in the manifest. When a connector is added or refreshed, Manifold connects to the endpoint, calls `tools/list` over MCP protocol, and stores the result in the database. Tools appear automatically.

**The manifest schema** is defined as a Zod schema in `src/lib/manifest.ts` and shared with the CLI package. All manifest validation runs through this single source of truth.

---

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manifold

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=                    # 32+ char random string

# Google OAuth (user login)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
ALLOWED_EMAIL_DOMAIN=tunga.io       # Restrict sign-in to this domain

# Encryption
ENCRYPTION_KEY=                     # 64-char hex string (32 bytes)
ENCRYPTION_KEY_VERSION=1

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

All variables are validated at startup via Zod in `src/lib/env.ts`. The app will not start if any required variable is missing.

---

## Docker Setup

### `docker-compose.yml` (Development)

```yaml
version: '3.9'
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: manifold
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  app:
    build: { context: ., target: dev }
    ports:
      - "3000:3000"
    env_file: .env.local
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/manifold
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next
    depends_on:
      db:
        condition: service_healthy

volumes:
  postgres_data:
```

### `Dockerfile`

```dockerfile
FROM node:20-alpine AS base
RUN corepack enable pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS dev
CMD ["pnpm", "dev"]

FROM base AS builder
COPY . .
RUN pnpm build

FROM node:20-alpine AS production
RUN corepack enable pnpm
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## Module Build Order

Build in strict sequence. Each module has a clear definition of done. Do not start the next until the current is complete and verified.

---

## Module 0 — Project Initialisation

**Goal:** Clean skeleton. `pnpm dev` serves the app. `docker compose up` starts postgres. No TypeScript errors.

**Steps:**
1. `pnpm create next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*" --no-turbo`
2. Install dependencies:
   ```
   pnpm add drizzle-orm pg next-auth@beta @auth/core zod lucide-react clsx tailwind-merge
   pnpm add -D drizzle-kit @types/pg tsx dotenv
   ```
3. `pnpm dlx shadcn@latest init` — Style: Default, Base colour: Neutral, CSS variables: Yes
4. Configure `tailwind.config.ts` — add all Manifold colour tokens under `theme.extend.colors`
5. Configure `tsconfig.json` — strict mode on
6. Create `docker-compose.yml` and `Dockerfile`
7. Create `.env.example` with all variables. Create `.env.local` with local values
8. Create full directory structure (`.gitkeep` for empty dirs)
9. Create `src/lib/env.ts` — Zod-validated env. All other files import from here, never from `process.env`
10. Create `src/lib/utils.ts` — `cn()` helper (clsx + tailwind-merge)
11. Create `drizzle.config.ts`
12. Verify: `docker compose up` healthy. `pnpm dev` compiles. Zero TS errors.

**Definition of done:** App is running. Database is reachable. TypeScript strict mode passes.

---

## Module 1 — Database Schema

**Goal:** All tables created and migrated. Drizzle client working.

`src/lib/db/schema.ts`:

```typescript
import { pgTable, uuid, text, timestamp, boolean, jsonb, pgEnum } from 'drizzle-orm/pg-core'

export const userRoleEnum  = pgEnum('user_role',       ['member', 'admin'])
export const connectorStatusEnum = pgEnum('connector_status', ['pending', 'active', 'deprecated'])
export const authTypeEnum  = pgEnum('auth_type',       ['api_key', 'oauth2', 'bearer_token', 'admin_managed', 'none'])
export const managedByEnum = pgEnum('managed_by',      ['user', 'admin'])

export const users = pgTable('users', {
  id:          uuid('id').primaryKey().defaultRandom(),
  email:       text('email').notNull().unique(),
  name:        text('name').notNull(),
  avatarUrl:   text('avatar_url'),
  role:        userRoleEnum('role').notNull().default('member'),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
  lastActiveAt: timestamp('last_active_at'),
})

// Connectors registered in the platform — backed by manifold.json manifests
export const connectors = pgTable('connectors', {
  id:               text('id').primaryKey(),             // kebab-case, e.g. "pipedrive"
  name:             text('name').notNull(),
  description:      text('description').notNull(),
  iconUrl:          text('icon_url'),
  version:          text('version').notNull(),
  status:           connectorStatusEnum('status').notNull().default('pending'),
  endpoint:         text('endpoint').notNull(),          // MCP server URL
  authType:         authTypeEnum('auth_type').notNull(),
  managedBy:        managedByEnum('managed_by').notNull().default('user'),
  manifest:         jsonb('manifest').notNull(),         // Full parsed manifold.json
  discoveredTools:  jsonb('discovered_tools'),           // Cached result of tools/list
  toolsDiscoveredAt: timestamp('tools_discovered_at'),
  submittedBy:      uuid('submitted_by').references(() => users.id),
  approvedBy:       uuid('approved_by').references(() => users.id),
  createdAt:        timestamp('created_at').notNull().defaultNow(),
  updatedAt:        timestamp('updated_at').notNull().defaultNow(),
})

// Admin-level credentials for admin_managed connectors
export const connectorAdminConfigs = pgTable('connector_admin_configs', {
  id:                   uuid('id').primaryKey().defaultRandom(),
  connectorId:          text('connector_id').notNull().references(() => connectors.id, { onDelete: 'cascade' }),
  encryptedConfig:      text('encrypted_config').notNull(),
  encryptionKeyVersion: text('encryption_key_version').notNull().default('1'),
  updatedAt:            timestamp('updated_at').notNull().defaultNow(),
})

// Per-user credentials for user-managed connectors
export const userConnectorConfigs = pgTable('user_connector_configs', {
  id:                   uuid('id').primaryKey().defaultRandom(),
  userId:               uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  connectorId:          text('connector_id').notNull().references(() => connectors.id, { onDelete: 'cascade' }),
  encryptedConfig:      text('encrypted_config').notNull(),
  encryptionKeyVersion: text('encryption_key_version').notNull().default('1'),
  enabled:              boolean('enabled').notNull().default(false),
  updatedAt:            timestamp('updated_at').notNull().defaultNow(),
})

// Admin fine-grained controls per connector
export const connectorPolicies = pgTable('connector_policies', {
  id:              uuid('id').primaryKey().defaultRandom(),
  connectorId:     text('connector_id').notNull().references(() => connectors.id, { onDelete: 'cascade' }),
  required:        boolean('required').notNull().default(false),    // force-enabled for all users
  visibleToRoles:  jsonb('visible_to_roles').notNull().default(['member', 'admin']),
  disabledTools:   jsonb('disabled_tools').notNull().default([]),   // tool names to block
  rateLimitPerHour: jsonb('rate_limit_per_hour'),                   // { toolName: limit }
  updatedAt:       timestamp('updated_at').notNull().defaultNow(),
})

export const oauthTokens = pgTable('oauth_tokens', {
  id:         uuid('id').primaryKey().defaultRandom(),
  userId:     uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash:  text('token_hash').notNull().unique(),
  clientId:   text('client_id').notNull(),
  expiresAt:  timestamp('expires_at').notNull(),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
})

export const auditLogs = pgTable('audit_logs', {
  id:           uuid('id').primaryKey().defaultRandom(),
  actorId:      uuid('actor_id').notNull().references(() => users.id),
  targetUserId: uuid('target_user_id').references(() => users.id),
  connectorId:  text('connector_id').references(() => connectors.id),
  action:       text('action').notNull(),
  detail:       jsonb('detail'),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
})

// Type exports
export type User                = typeof users.$inferSelect
export type Connector           = typeof connectors.$inferSelect
export type UserConnectorConfig = typeof userConnectorConfigs.$inferSelect
export type ConnectorPolicy     = typeof connectorPolicies.$inferSelect
export type AuditLog            = typeof auditLogs.$inferSelect
```

**Steps:**
1. Write schema above
2. `pnpm drizzle-kit generate` → migration files
3. `pnpm drizzle-kit migrate` → apply to local postgres
4. Write Drizzle client in `src/lib/db/index.ts` (connection pool via `pg`)
5. Write `scripts/seed.ts` — creates first admin user from env var `SEED_ADMIN_EMAIL`
6. Verify in `pnpm drizzle-kit studio` — all tables present with correct columns

**Definition of done:** Six tables exist in postgres. Seed creates admin user. Studio shows schema.

---

## Module 2 — Authentication

**Goal:** Users sign in with Google. Only `ALLOWED_EMAIL_DOMAIN` emails accepted. First user to sign in becomes admin. Sessions persist.

**Steps:**

1. `src/lib/auth.ts` — NextAuth v5 config:
   - Google provider
   - `signIn` callback: reject emails not ending in `@${env.ALLOWED_EMAIL_DOMAIN}`
   - `signIn` callback: upsert user into `users` table. If no users exist yet, make this user admin (first-run bootstrap)
   - `session` callback: expose `id` and `role` on the session object
   - Augment session types in `src/types/next-auth.d.ts`

2. `src/app/api/auth/[...nextauth]/route.ts`

3. `src/middleware.ts`:
   - Routes under `/(app)` and `/admin` require session → redirect to `/login`
   - Routes under `/admin` require `role === 'admin'` → redirect to `/connectors`
   - `/onboarding` requires `role === 'admin'`
   - After sign-in, check if onboarding is complete (see Module 7) — redirect to `/onboarding` if not

4. Login page `src/app/(auth)/login/page.tsx`:
   - Dark background with dot-grid texture
   - Manifold wordmark + mark centred
   - One button: "Continue with Google" — Amber, clean
   - Tagline below: "Your team's AI connectors, in one place."
   - No forms. No other options. Nothing else.

**Definition of done:** Domain-restricted Google login works. First user becomes admin. Session exposes role. Middleware correctly gates routes.

---

## Module 3 — OAuth 2.0 Authorization Server

**Goal:** Issue Bearer tokens to MCP clients (Claude, etc.) via OAuth 2.1 Authorization Code + PKCE flow.

**Endpoints:**

| Endpoint | Method | Purpose |
|---|---|---|
| `/.well-known/oauth-authorization-server` | GET | Server metadata (discovery) |
| `/oauth/authorize` | GET | Begin auth flow — requires active session |
| `/oauth/token` | POST | Exchange code for Bearer token |

**`src/lib/oauth.ts`** — implement:
- `generateOAuthCode(userId, clientId, codeChallenge)` — stores short-lived (10 min) code in DB or Redis-like store (use postgres for v1)
- `exchangeCodeForToken(code, codeVerifier, clientId)` — validates PKCE, issues 64-char hex token, stores SHA-256(token) in `oauth_tokens`, returns plaintext once
- `resolveToken(authHeader)` — extracts Bearer token, hashes it, looks up user, checks expiry

**Consent screen** (`/oauth/authorize` page):
- Clean full-page design on dark background
- Shows: app name requesting access, one-sentence description of what's being granted
- "Authorise" (Amber primary button) and "Cancel" (text link)
- No permission list. No jargon.

**Admin OAuth client management** (data model here, UI in Module 9):
- Store `oauth_clients` table: `id`, `name`, `client_id`, `hashed_secret`, `redirect_uris`, `created_at`
- Admin generates client_id + client_secret pairs — secret shown once, stored as hash

**Definition of done:** Full PKCE flow works end-to-end with curl. Metadata endpoint returns valid JSON. Token stored as hash.

---

## Module 4 — Connector Registry (Manifest-Based)

**Goal:** Admin can register connectors by submitting a `manifold.json`. Tools are auto-discovered from the connector's MCP endpoint. No connector code lives in this codebase.

### Manifest Validation

`src/lib/manifest.ts` — define the Zod schema for `manifold.json`:

```typescript
import { z } from 'zod'

const InjectionSchema = z.discriminatedUnion('method', [
  z.object({ method: z.literal('header'), name: z.string() }),
  z.object({ method: z.literal('query'),  name: z.string() }),
  z.object({ method: z.literal('bearer') }),
])

const AuthFieldSchema = z.object({
  key:         z.string(),
  label:       z.string(),
  description: z.string().optional(),
  docsUrl:     z.string().url().optional(),
  secret:      z.boolean(),
  required:    z.boolean(),
  type:        z.enum(['text', 'password', 'url']).default('text'),
  injection:   InjectionSchema.optional(),
})

const AuthSchema = z.discriminatedUnion('type', [
  z.object({
    type:    z.literal('api_key'),
    managed: z.enum(['user', 'admin']),
    fields:  z.array(AuthFieldSchema).min(1),
  }),
  z.object({
    type:         z.literal('oauth2'),
    managed:      z.enum(['user', 'admin']),
    scopes:       z.array(z.string()),
    authorizeUrl: z.string().url(),
    tokenUrl:     z.string().url(),
    adminNote:    z.string().optional(),
  }),
  z.object({ type: z.literal('bearer_token'), managed: z.enum(['user', 'admin']), fields: z.array(AuthFieldSchema) }),
  z.object({ type: z.literal('admin_managed') }),
  z.object({ type: z.literal('none') }),
])

export const ManifestSchema = z.object({
  manifestVersion: z.literal('1'),
  id:              z.string().regex(/^[a-z0-9-]+$/),
  name:            z.string(),
  version:         z.string(),
  description:     z.string(),
  icon:            z.string().url().optional(),
  endpoint:        z.string().url(),
  auth:            AuthSchema,
})

export type Manifest = z.infer<typeof ManifestSchema>
```

### Tool Discovery

`src/lib/mcp/discovery.ts`:

```typescript
// connectAndDiscover(endpoint: string, testCredentials?: Record<string, string>): Promise<McpTool[]>
// 1. Connect to endpoint via HTTP POST (MCP JSON-RPC)
// 2. Send initialize request
// 3. Send tools/list request
// 4. Return tool definitions
// Timeout: 10 seconds. Throw clear error if unreachable or returns invalid response.
```

### Admin API Routes

`POST /api/admin/connectors` — register a connector:
- Body: `{ manifestUrl?: string, manifest?: object }` — accept either a URL to fetch or raw manifest
- Validate against `ManifestSchema`
- Check `id` is unique
- Run `connectAndDiscover()` to fetch tool list
- Insert into `connectors` table with `status: 'active'`
- Create default `connectorPolicies` row
- Log audit event: `connector.registered`

`POST /api/admin/connectors/[id]/refresh-tools` — re-run tool discovery:
- Calls `connectAndDiscover()` again
- Updates `discoveredTools` and `toolsDiscoveredAt`

`PATCH /api/admin/connectors/[id]` — update status, endpoint, etc.

`DELETE /api/admin/connectors/[id]` — soft-delete (set status: deprecated)

**Definition of done:** Admin can POST a manifest URL, Manifold fetches and validates it, discovers tools, stores the connector. All four fields populate in the database correctly.

---

## Module 5 — Credential Encryption

**Goal:** All credentials encrypted at rest. Encryption utility is tested and correct.

`src/lib/crypto.ts`:

```typescript
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY
  if (!hex || hex.length !== 64) throw new Error('ENCRYPTION_KEY must be 64-char hex')
  return Buffer.from(hex, 'hex')
}

export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  const version = process.env.ENCRYPTION_KEY_VERSION ?? '1'
  return `${version}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decrypt(stored: string): string {
  const [, ivHex, tagHex, ciphertextHex] = stored.split(':')
  const key = getKey()
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return decipher.update(Buffer.from(ciphertextHex, 'hex')) + decipher.final('utf8')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function generateToken(): string {
  return randomBytes(32).toString('hex')
}
```

Write unit tests using Node's built-in `node:test`. Test: round-trip, tampered ciphertext throws, wrong key throws.

**Definition of done:** Tests pass. `encrypt(decrypt(x)) === x`. Tampered ciphertexts rejected.

---

## Module 6 — MCP Gateway (Pure Proxy)

**Goal:** A single endpoint at `/mcp` that resolves the user from their Bearer token, loads their enabled connectors, applies policy controls, and proxies tool calls to the correct connector endpoint with credentials injected.

Manifold does not execute any tool logic. It routes.

### Protocol

MCP uses JSON-RPC 2.0 over HTTP with SSE for streaming. The gateway handles:
- `initialize` — respond with server info and capabilities
- `tools/list` — return the combined tool list from all enabled connectors, filtered by policy
- `tools/call` — proxy to the correct connector endpoint

### `src/lib/mcp/proxy.ts`

```typescript
// resolveUser(authHeader: string): Promise<User | null>
// — Hash Bearer token, look up in oauth_tokens, check expiry

// getEnabledTools(userId: string): Promise<McpTool[]>
// — Load user's enabled connectors from DB
// — For each connector: load discoveredTools from DB
// — Apply connectorPolicies: filter out disabled tools
// — Return merged tool list

// proxyToolCall(userId, toolName, args): Promise<unknown>
// — Find which connector owns this tool (stored in discoveredTools)
// — Load user's encrypted config for that connector → decrypt
// — If connector is admin_managed: load connectorAdminConfigs instead
// — Build the MCP request: { jsonrpc: '2.0', method: 'tools/call', params: { name: toolName, arguments: args } }
// — Inject credentials per the manifest's injection spec (header / query / bearer)
// — POST to connector.endpoint with 30s timeout
// — Return response or structured error
```

### `src/app/mcp/route.ts`

```typescript
// GET  /mcp → return SSE stream (long-lived connection)
// POST /mcp → parse JSON-RPC body, handle, return JSON
//
// Both paths:
// 1. Validate Authorization: Bearer {token}
// 2. resolveUser() → 401 if invalid or expired
// 3. Update user.lastActiveAt
// 4. Route by method:
//    - 'initialize'  → return server capabilities
//    - 'tools/list'  → return getEnabledTools()
//    - 'tools/call'  → return proxyToolCall()
//    - other         → JSON-RPC method-not-found error
```

**Rate limiting:** In-memory per-token rate limiter on `/mcp`. 100 requests/min. Return 429 with `Retry-After: 60`.

**SSE timeout:** Close SSE connections after 60s of inactivity. Clients reconnect and re-initialize — this is correct MCP behaviour.

**Definition of done:** Using `@modelcontextprotocol/sdk` test script: connect with valid token, `tools/list` returns tools from enabled connectors, `tools/call` proxies correctly to the connector endpoint and returns a real response.

---

## Module 7 — Homepage + First-Run Onboarding

**Goal:** A homepage that sells the product clearly, and a guided onboarding wizard that gets a new Manifold deployment configured in under 5 minutes.

### Homepage `src/app/(marketing)/page.tsx`

This is the first thing someone sees when they discover Manifold — whether that's visiting the demo instance or landing on their own deployed instance.

Design:
- Full dark background (Obsidian) with dot-grid texture
- Manifold wordmark + mark hero centred
- One-line headline: `"One endpoint. Every connector."`
- Two-line subhead: `"Self-hosted MCP access management for teams. One login, one URL, your whole AI stack."`
- Two CTAs side by side:
  - Primary (Amber): "Get started" → `/login`
  - Secondary (ghost): "View on GitHub" → links to repo
- Below: three-panel "How it works" section:
  1. Deploy Manifold on your server
  2. Add your connectors via URL or form
  3. Your team connects with one click
- Footer: "Open source. Self-hosted. Yours." — nothing else

Keep it short. No feature grid. No pricing. No testimonials. Three panels and two buttons.

### First-Run Onboarding `src/app/onboarding/page.tsx`

Triggered automatically after first admin sign-in if `onboarding_complete` is not set.

A three-step wizard with progress indicator:

**Step 1 — Copy your MCP URL**
- Shows the MCP endpoint URL in a prominent monospace copyable block: `https://your-domain.com/mcp`
- Instruction: "Add this URL to your AI tool's org settings as a remote MCP connector."
- Shows exactly where in Claude's settings to paste it (screenshot or clear diagram)
- "I've added it" → Step 2

**Step 2 — Generate OAuth credentials**
- Auto-generates a Client ID + Client Secret on page load
- Shows them in copyable fields — Secret shown once with explicit warning
- "These go in your AI tool's OAuth settings alongside the URL."
- "Done" → Step 3

**Step 3 — Add your first connector**
- Simple form: paste a `manifold.json` URL, or fill in name + endpoint + auth type manually
- "Test connection" button — calls discovery, shows success/failure inline
- On success: "Your first connector is live. Add more from the admin panel."
- "Go to dashboard" → `/connectors`

Onboarding state is tracked with a simple `settings` table row or a user flag. Once complete, the wizard is no longer shown.

**Definition of done:** Fresh deployment → sign in → onboarding wizard appears → completing all three steps results in a working MCP URL, valid OAuth credentials, and at least one registered connector.

---

## Module 8 — User Connector UI

**Goal:** Users see available connectors, enable them, configure credentials, and test connections. Fast, clean, no friction.

### App Shell `src/app/(app)/layout.tsx`

- Left sidebar: 220px, Obsidian background, dot-grid texture
- Top of sidebar: Manifold mark + wordmark
- Nav: Connectors (primary), Settings
- Bottom of sidebar: user avatar + name + dropdown (Settings, Sign out)
- Content area: Parchment background, scrolls independently

### Connector List `/connectors`

- Heading: "Connectors" — large, weight 400
- Subhead: "Connect your tools to your AI assistant." — Warm Grey
- Grid: 3 columns desktop, 1 mobile
- Connector card (see Design System for spec):
  - Icon, name, description, status badge, toggle
  - Clicking card or a "Configure" affordance opens the config sheet
  - Toggling on a connector that has no config → opens config sheet first
  - Toggling off: immediate, 5-second undo toast

### Connector Config Sheet

shadcn `Sheet`, slides in from right, 420px.

- Header: connector icon + name + status badge
- Auth fields rendered from connector manifest's `auth.fields`
- Secret fields: shows `••••••••` with lock icon if already saved. "Change" link clears the field for re-entry.
- "Test connection" button → POST `/api/connectors/[id]/test` → 10s timeout → inline success/error result
- "Save" → encrypts + stores config, enables connector if not already enabled
- "Remove credentials" → confirm dialog → clears config, disables connector

**Definition of done:** User enables a connector, saves credentials, test connection succeeds, connector appears as Active in their tool list when they call `tools/list` via MCP.

---

## Module 9 — Admin Panel

**Goal:** Full org visibility and fine-grained connector governance.

### Admin Shell `src/app/admin/layout.tsx`

Same sidebar pattern as app shell. "Admin" badge in sidebar header (Amber text, subtle background).

### Connector Registry `/admin/connectors`

The primary admin surface for managing what connectors exist in the platform.

**List view:**
- Table: Icon, Name, Version, Status badge, Users enabled, Tool count, Last updated
- "Add Connector" button → opens add connector sheet (Module 4 API)
- Click row → connector detail

**Connector detail `/admin/connectors/[id]`:**

Tabbed layout:

*Overview tab:*
- Endpoint URL (copyable)
- Auth type, managed-by
- Submitted by, approved date
- "Refresh tools" button — re-runs discovery
- "Deprecate" button (with confirm dialog)

*Tools tab:*
- List all discovered tools: name, description, enabled/disabled toggle
- Admin can disable individual tools — disabled tools are filtered from `tools/list` for all users
- "Refresh" re-runs discovery and updates the list

*Policy tab:*
- **Required:** toggle — if on, connector is auto-enabled for all users in scope and they cannot disable it
- **Visibility:** dropdown — All users / Admin only
- **Rate limits:** per-tool rate limit inputs (max calls/hour/user). Leave blank for unlimited.
- Save button — writes to `connectorPolicies`

*Credentials tab (admin_managed connectors only):*
- Input form for org-level credentials (same pattern as user config sheet)
- These are the credentials Manifold injects for ALL users of this connector

*Usage tab:*
- Enabled user count
- Total tool calls (today / 7d / 30d)
- Error rate
- Most-called tools
- Recent activity (last 20 tool calls with timestamp + user + tool name)

### User Management `/admin/users`

- Table: Avatar, Name, Email, Role badge, Connectors enabled count, Last active
- Search by name/email
- Click row → user detail

**User detail `/admin/users/[id]`:**
- Profile summary
- Connector list: each connector with enabled state + configured state
- "Configure on behalf" → opens config sheet, saves for that user, logs audit with `actorId = admin, targetUserId = user`
- Role toggle: Member ↔ Admin with confirmation dialog
- Prevent admin from removing their own admin role if last admin

### OAuth Credentials `/admin/settings`

- MCP URL: `https://yourdomain.com/mcp` — large copyable monospace block
- OAuth clients table: Client ID (visible), Secret (masked), Created, Actions
- "Generate credentials" → creates pair, shows Secret ONCE with copy button + warning
- "Revoke" per client

### Audit Log `/admin/audit`

- Table: Timestamp, Actor, Action, Target, Connector, Details
- Filter by date range, action type, connector
- Expandable detail (jsonb rendered cleanly)
- Human-readable action labels: "Connector registered", "Credentials updated by admin", "Tool disabled"

**Definition of done:** Admin can register a connector, set tool policies, configure credentials on behalf of a user, generate OAuth credentials, and view the audit trail.

---

## Module 10 — Connector CLI (`@manifold/cli`)

**Goal:** Developers can manage Manifold entirely from the terminal. Full parity with the admin UI.

Package lives at `packages/cli/`. Published to npm as `@manifold/cli`.

### Commands

```bash
# Connector development
manifold init [name]           # Scaffold a manifold.json in current directory
manifold validate              # Validate local manifold.json + test endpoint connectivity
manifold publish               # Submit to a Manifold instance registry

# Registry management (requires admin token)
manifold connectors ls         # List all registered connectors
manifold connectors get [id]   # Get connector details + tool list
manifold connectors refresh [id]  # Re-run tool discovery
manifold connectors deprecate [id]

# User management
manifold users ls
manifold users set-role [email] [role]

# Token management
manifold tokens ls
manifold tokens revoke [id]
```

### `manifold init`

Generates a `manifold.json` template:

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

### `manifold validate`

1. Reads `manifold.json` from current directory
2. Validates against `ManifestSchema` (shared with `src/lib/manifest.ts`)
3. Attempts to connect to `endpoint` and calls `initialize` + `tools/list`
4. Reports: validation pass/fail, reachability, tool count discovered

### `manifold publish`

```bash
manifold publish --registry https://mcp.yourdomain.com --token [admin-token]
```

1. Reads + validates local `manifold.json`
2. POSTs to `POST /api/admin/connectors` with manifest as body
3. Reports: success (connector ID, tool count) or error with message

### Auth for CLI

Admin generates a long-lived API token from the admin settings page. CLI uses this token via `--token` flag or `MANIFOLD_TOKEN` environment variable, or stores it via `manifold login`.

**Definition of done:** `manifold init` → `manifold validate` → `manifold publish` is a complete workflow. `manifold connectors ls` returns the registry from a running instance.

---

## Module 11 — Polish, Error Handling, Production

**Goal:** The product feels complete. Every path has a designed state. Ready to deploy.

### Error Handling

- API routes: `{ error: { code: string, message: string } }` — always structured
- MCP gateway: valid JSON-RPC error objects — never 500s from tool failures
- Client-side: `react-error-boundary` on page content, tasteful error UI
- Toast notifications for all async actions

### Loading States

- Skeleton loaders for all data tables and connector grids
- Button spinners for async actions
- SSE connection indicator in the app shell (connected / reconnecting)

### Empty States

Every empty state has a designed view:
- `/connectors` with no connectors registered: "No connectors available. Ask your admin to add one."
- Admin connector list empty: "No connectors yet. Add your first one." + button
- Audit log empty: "No events recorded yet."

### Environment Validation `src/lib/env.ts`

```typescript
import { z } from 'zod'

const schema = z.object({
  DATABASE_URL:          z.string().url(),
  NEXTAUTH_URL:          z.string().url(),
  NEXTAUTH_SECRET:       z.string().min(32),
  GOOGLE_CLIENT_ID:      z.string().min(1),
  GOOGLE_CLIENT_SECRET:  z.string().min(1),
  ALLOWED_EMAIL_DOMAIN:  z.string().min(1),
  ENCRYPTION_KEY:        z.string().length(64),
  ENCRYPTION_KEY_VERSION: z.string().default('1'),
  NEXT_PUBLIC_APP_URL:   z.string().url(),
})

export const env = schema.parse(process.env)
```

### Production Docker `docker-compose.prod.yml`

- App (production build) + PostgreSQL + Caddy (reverse proxy with automatic HTTPS)
- Caddy config: one-line `yourdomain.com` → automatic cert

### Health Check `src/app/api/health/route.ts`

Returns `{ status: 'ok', db: 'ok', version: '...' }` or 503 if DB unreachable.

**Definition of done:** `pnpm build` succeeds. `docker compose -f docker-compose.prod.yml up` starts cleanly. All empty states visible. Error paths show useful messages.

---

## Blindspots — Handle These Upfront

**Token expiry.** Gateway checks `expiresAt` on every request. Return proper 401 on expiry. Tokens last 90 days — no refresh token in v1. MCP clients will re-prompt authorization.

**Connector discovery failures.** If `connectAndDiscover()` fails during registration (endpoint unreachable, bad response), reject the registration with a clear error. Don't store a connector with no tools.

**Tool name conflicts.** Two connectors may expose tools with the same name. On registration, check for name collisions across all active connectors. Reject with a clear error listing the conflict.

**Orphaned user configs.** If a connector is deprecated, users may have `userConnectorConfigs` rows for it. Gateway skips these gracefully. Admin UI flags them as "connector removed" with a cleanup option.

**Policy inheritance.** `required` connectors auto-enable for users. If a required connector is also `admin_managed`, users don't need to configure anything. If it's `user` managed, they still need to provide credentials — required just means they can't disable it once configured.

**Admin bootstrap.** First user to sign in becomes admin. This is the only way to bootstrap without a seed script. Document this clearly in the README and onboarding flow.

**Secret field updates.** When user updates credentials, always re-encrypt the full config object — never merge field-by-field. Prevents partial-credential states.

**SSE in production.** Ensure the reverse proxy (Caddy) passes `Connection: keep-alive` and does not buffer SSE responses. Add to Caddy config explicitly.

---

## Coding Standards

- TypeScript strict mode throughout. No `any`.
- Import `env` from `src/lib/env.ts` — never use `process.env` directly elsewhere
- Zod validation on all API boundaries
- Drizzle typed queries only — no raw SQL unless explicitly necessary
- Named exports everywhere except pages and layouts
- No `console.log` in production code — remove or replace with a logger
- Commit messages: imperative, lowercase: `add connector policy table`, `fix sse timeout in production`

---

## Starting Instructions for Claude Code

1. Read this entire file before writing any code.
2. Start at Module 0 and proceed in order.
3. Confirm the Definition of Done for each module before moving to the next.
4. Never add a `src/connectors/` directory — there are no built-in connectors.
5. Ask before making security-sensitive decisions (encryption, OAuth, token handling).
6. The MCP URL is `/mcp`. The manifest submission endpoint is `/api/admin/connectors`. These are fixed.
7. When in doubt about copy or UI text, refer to the Voice & Copy Tone section. Default to shorter.
