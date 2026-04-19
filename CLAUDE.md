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

---

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
│   ├── app/                     # Next.js App Router
│   │   ├── (auth)/              # Route group — auth pages
│   │   │   └── login/
│   │   ├── (app)/               # Route group — main app (requires auth)
│   │   │   ├── layout.tsx       # App shell: nav, sidebar
│   │   │   ├── connectors/      # User connector management
│   │   │   └── settings/        # User settings
│   │   ├── admin/               # Admin-only routes (separate layout)
│   │   │   ├── layout.tsx
│   │   │   ├── users/
│   │   │   ├── connectors/
│   │   │   └── settings/
│   │   ├── oauth/               # OAuth 2.0 server endpoints
│   │   │   ├── authorize/
│   │   │   └── token/
│   │   ├── mcp/                 # MCP gateway endpoint
│   │   │   └── route.ts         # Single entry point: /mcp
│   │   ├── api/                 # Internal API routes
│   │   │   ├── connectors/
│   │   │   └── admin/
│   │   └── layout.tsx           # Root layout
│   │
│   ├── components/
│   │   ├── ui/                  # shadcn/ui primitives (auto-generated, customised)
│   │   ├── connectors/          # Connector-specific components
│   │   ├── admin/               # Admin-specific components
│   │   └── shared/              # Shared components (nav, shell, etc.)
│   │
│   ├── lib/
│   │   ├── auth.ts              # NextAuth config
│   │   ├── db/
│   │   │   ├── index.ts         # Drizzle client
│   │   │   ├── schema.ts        # Full schema definition
│   │   │   └── migrations/      # Drizzle-generated migrations
│   │   ├── crypto.ts            # AES-256-GCM encryption/decryption
│   │   ├── oauth.ts             # OAuth 2.0 server logic
│   │   ├── mcp/
│   │   │   ├── protocol.ts      # MCP JSON-RPC 2.0 handler
│   │   │   ├── gateway.ts       # Multi-tenant request router
│   │   │   └── types.ts         # MCP protocol types
│   │   └── utils.ts             # Shared utilities
│   │
│   ├── connectors/              # THE CONNECTOR REGISTRY — see Module 4
│   │   ├── _registry.ts         # Auto-imports all connectors, exports list
│   │   ├── _types.ts            # ConnectorDefinition interface
│   │   ├── trello/
│   │   │   └── index.ts
│   │   ├── twist/
│   │   │   └── index.ts
│   │   ├── google-drive/
│   │   │   └── index.ts
│   │   └── pipedrive/
│   │       └── index.ts
│   │
│   └── types/
│       ├── index.ts             # Global type exports
│       └── next-auth.d.ts       # Session type augmentation
│
└── scripts/
    └── seed.ts                  # Dev seed: create admin user
```

---

## Environment Variables

Document these in `.env.example` with descriptions. Every variable must be present before the app starts.

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mcpplatform

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=                          # 32+ char random string

# Google OAuth (for user login)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
ALLOWED_EMAIL_DOMAIN=tunga.io             # Restrict login to this domain

# Encryption
ENCRYPTION_KEY=                           # 64-char hex string (32 bytes)
ENCRYPTION_KEY_VERSION=1                  # Increment on rotation

# OAuth 2.0 Server (for MCP clients like Claude)
# These are generated by the admin UI on first setup — leave blank initially
# OAUTH_CLIENT_ID=
# OAUTH_CLIENT_SECRET=
```

---

## Docker Setup

### `docker-compose.yml` (Local Development)

```yaml
version: '3.9'
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: mcpplatform
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
    build:
      context: .
      target: dev
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/mcpplatform
    env_file:
      - .env.local
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

Build these in strict sequence. Each module is a self-contained deliverable with a clear definition of done. Do not start the next module until the current one is complete and tested.

---

## Module 0 — Project Initialisation

**Goal:** Clean, runnable project skeleton. `pnpm dev` and `docker compose up` both work.

**Steps:**
1. `pnpm create next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*" --no-turbo`
2. Install dependencies:
   ```
   pnpm add drizzle-orm pg @auth/core next-auth@beta zod lucide-react clsx tailwind-merge
   pnpm add -D drizzle-kit @types/pg tsx dotenv
   ```
3. Install shadcn/ui: `pnpm dlx shadcn@latest init`
   - Style: Default
   - Base colour: Neutral
   - CSS variables: Yes
4. Customise `tailwind.config.ts` to add Geist font variables
5. Set up `tsconfig.json` with strict mode
6. Create `docker-compose.yml` and `Dockerfile` as above
7. Create `.env.example` with all variables documented
8. Create `.env.local` with local dev values
9. Set up directory structure (create all folders, add `.gitkeep` where needed)
10. Create `src/lib/db/index.ts` with Drizzle client (not connected yet — just the export pattern)
11. Create `src/lib/utils.ts` with `cn()` helper (clsx + tailwind-merge)
12. Set up `drizzle.config.ts`
13. Verify: `docker compose up` starts postgres; `pnpm dev` serves the Next.js default page

**Definition of done:** Docker compose starts cleanly. App compiles. No TypeScript errors.

---

## Module 1 — Database Schema & Migrations

**Goal:** All four tables created, migrated, Drizzle client working.

**Schema — `src/lib/db/schema.ts`:**

```typescript
import { pgTable, uuid, text, timestamp, boolean, jsonb, pgEnum } from 'drizzle-orm/pg-core'

export const userRoleEnum = pgEnum('user_role', ['member', 'admin'])

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  role: userRoleEnum('role').notNull().default('member'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const oauthTokens = pgTable('oauth_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(), // SHA-256 of plaintext token
  clientId: text('client_id').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const userConnectorConfigs = pgTable('user_connector_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  connectorId: text('connector_id').notNull(),  // references connector registry
  encryptedConfig: text('encrypted_config').notNull(), // AES-256-GCM encrypted JSON
  encryptionKeyVersion: text('encryption_key_version').notNull().default('1'),
  enabled: boolean('enabled').notNull().default(false),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id').notNull().references(() => users.id),
  targetUserId: uuid('target_user_id').references(() => users.id),
  action: text('action').notNull(), // e.g. 'connector.enabled', 'config.updated'
  detail: jsonb('detail'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Type exports
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type OAuthToken = typeof oauthTokens.$inferSelect
export type UserConnectorConfig = typeof userConnectorConfigs.$inferSelect
export type AuditLog = typeof auditLogs.$inferSelect
```

**Steps:**
1. Write schema as above in `src/lib/db/schema.ts`
2. Set up `drizzle.config.ts` pointing to schema
3. Run `pnpm drizzle-kit generate` → creates migration files
4. Run `pnpm drizzle-kit migrate` → applies to local postgres
5. Write `src/lib/db/index.ts` — Drizzle client with connection pool
6. Write `scripts/seed.ts` — creates a single admin user (reads email from env)
7. Verify: Connect to postgres, confirm all tables exist with correct columns

**Definition of done:** `pnpm drizzle-kit studio` shows all four tables. Seed script creates admin user.

---

## Module 2 — Authentication (Google OAuth + Sessions)

**Goal:** Users can log in with Google. Only `ALLOWED_EMAIL_DOMAIN` emails accepted. Sessions persist. User is created in DB on first login.

**Steps:**

1. Configure NextAuth v5 in `src/lib/auth.ts`:
   - Google provider
   - Domain restriction: reject any email not ending in `@${process.env.ALLOWED_EMAIL_DOMAIN}`
   - On `signIn` callback: upsert user into `users` table (create if first login)
   - Expose `role` and `id` on the session object
   - Augment session types in `src/types/next-auth.d.ts`

2. Create `src/app/api/auth/[...nextauth]/route.ts`

3. Create login page at `src/app/(auth)/login/page.tsx`:
   - Centered layout, dark background
   - Product name / wordmark (placeholder text if name TBD)
   - "Continue with Google" button — clean, no Google branding colours, just the Google icon from lucide-react
   - Tagline: "Your team's AI connectors, in one place."
   - Minimal. No forms. One action.

4. Create `src/app/(auth)/layout.tsx`:
   - Full-height centered layout
   - Subtle noise texture or gradient background (CSS only, no images)

5. Add auth middleware `src/middleware.ts`:
   - All routes under `/(app)` and `/admin` require session
   - Redirect unauthenticated users to `/login`
   - Redirect non-admin users away from `/admin`

6. Create `src/components/shared/user-menu.tsx`:
   - Avatar (Google profile image or initials)
   - Dropdown: Settings, Sign out
   - Appears in app shell nav

**Definition of done:** `@yourdomain` user can log in, is created in DB with `member` role. Non-domain email is rejected with a clear error. Admin role is assignable via seed script.

---

## Module 3 — OAuth 2.0 Authorization Server

**Goal:** The platform can issue Bearer tokens to MCP clients (Claude, etc.) via a standard OAuth 2.0 Authorization Code flow. This is what allows Claude's org settings to point at this platform.

**This is the most protocol-sensitive module. Read the MCP OAuth spec before implementing.**

MCP now requires OAuth 2.1 compliance (April 2026 spec update). Key requirements:
- Authorization Code flow with PKCE
- No implicit flow
- Token endpoint must return access tokens and optionally refresh tokens
- Access tokens are opaque Bearer tokens
- Server must expose `/.well-known/oauth-authorization-server` metadata endpoint

**Endpoints to implement:**

| Endpoint | Path | Purpose |
|---|---|---|
| Metadata | `GET /.well-known/oauth-authorization-server` | OAuth server discovery |
| Authorise | `GET /oauth/authorize` | Redirect to Google login, then back |
| Token | `POST /oauth/token` | Exchange code for Bearer token |
| Client registration | Admin UI only | Generates client_id + client_secret |

**`src/lib/oauth.ts` — Core logic:**

```typescript
// Functions to implement:
generateOAuthCode(userId: string, clientId: string, codeChallenge: string): Promise<string>
// Stores a short-lived (10 min) authorization code linked to userId + clientId

exchangeCodeForToken(code: string, codeVerifier: string, clientId: string): Promise<string>
// Validates PKCE, issues opaque Bearer token
// Stores SHA-256(token) in oauth_tokens table
// Returns plaintext token ONCE — never stored

hashToken(token: string): string
// SHA-256 hex digest

resolveToken(tokenHash: string): Promise<User | null>
// Lookup user from hashed token, check expiry
```

**Authorization flow:**
1. MCP client (Claude) redirects user to `/oauth/authorize?client_id=...&code_challenge=...&redirect_uri=...`
2. Platform checks if user has an active session — if not, redirects to Google login first
3. User sees a clean consent screen: "Claude is requesting access to your connectors"
4. On approval: generate auth code, redirect to MCP client's `redirect_uri?code=...`
5. MCP client POSTs code + PKCE verifier to `/oauth/token`
6. Platform validates, issues Bearer token (UUID v4 or 32-byte random hex)
7. Platform stores `SHA-256(token)` in DB — plaintext never persisted

**Admin settings page** (built in Module 8, but the data model goes here):
- Generate OAuth `client_id` and `client_secret` pairs
- These are what the admin copies into Claude's org settings
- Store hashed client_secret — same pattern as tokens

**Consent screen design:**
- Clean modal or full-page view
- Shows: requesting app name, what access is being granted ("Read and execute your enabled connectors")
- Two buttons: "Authorise" (primary) and "Cancel" (text link)
- No scary permission lists — just one clear sentence

**Definition of done:** A test OAuth client (curl or Postman) can complete the full Authorization Code + PKCE flow and receive a Bearer token. Token is stored as hash in DB. Metadata endpoint returns correct JSON.

---

## Module 4 — Connector Registry & Definition Format

**Goal:** A clean, extensible format for defining connectors. Adding a new connector means adding one TypeScript file. Zero changes to the core platform.

**This is the most architecturally important module. Get this right and the rest is mechanical.**

### The ConnectorDefinition Interface

`src/connectors/_types.ts`:

```typescript
import { z } from 'zod'

// A field in the connector's configuration form
export interface ConfigField {
  key: string
  label: string
  type: 'text' | 'password' | 'url' | 'textarea' | 'select'
  placeholder?: string
  description?: string
  required: boolean
  secret: boolean        // If true: encrypted at rest, never returned to UI after save
  options?: { label: string; value: string }[]  // For 'select' type
}

// An MCP tool provided by this connector
export interface ConnectorTool {
  name: string           // e.g. "trello_create_card" — must be globally unique
  description: string    // Shown to the AI model — be specific and precise
  inputSchema: z.ZodObject<any>  // Zod schema for tool arguments
  handler: (args: unknown, config: Record<string, string>) => Promise<unknown>
  // config = decrypted connector config for this user (API keys, etc.)
}

// The complete connector definition
export interface ConnectorDefinition {
  id: string             // Unique, kebab-case e.g. "trello", "google-drive"
  name: string           // Display name: "Trello"
  description: string    // One sentence: what does this connector do?
  icon: string           // SVG string or lucide icon name
  version: string        // Semver e.g. "1.0.0"
  status: 'active' | 'beta' | 'deprecated'
  managedBy: 'user' | 'admin'
  // user = each user provides their own credentials
  // admin = org-level credentials, users just enable it

  configFields: ConfigField[]
  // These fields appear in the connector config form

  configSchema: z.ZodObject<any>
  // Zod validation for the submitted config object

  tools: ConnectorTool[]
  // All MCP tools this connector exposes

  testConnection?: (config: Record<string, string>) => Promise<{ ok: boolean; message?: string }>
  // Optional: called when user clicks "Test connection" in the UI
}
```

### The Registry

`src/connectors/_registry.ts`:

```typescript
import { ConnectorDefinition } from './_types'
import { trello } from './trello'
import { twist } from './twist'
import { googleDrive } from './google-drive'
import { pipedrive } from './pipedrive'

export const connectorRegistry: ConnectorDefinition[] = [
  trello,
  twist,
  googleDrive,
  pipedrive,
]

export function getConnector(id: string): ConnectorDefinition | undefined {
  return connectorRegistry.find(c => c.id === id)
}

export function getActiveConnectors(): ConnectorDefinition[] {
  return connectorRegistry.filter(c => c.status !== 'deprecated')
}
```

### Example Connector — Trello

`src/connectors/trello/index.ts`:

```typescript
import { z } from 'zod'
import { ConnectorDefinition } from '../_types'

export const trello: ConnectorDefinition = {
  id: 'trello',
  name: 'Trello',
  description: 'Create cards, move tasks, and read boards from Trello.',
  icon: 'trello',  // lucide icon name
  version: '1.0.0',
  status: 'active',
  managedBy: 'user',

  configFields: [
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'password',
      placeholder: 'Your Trello API key',
      description: 'Found at https://trello.com/app-key',
      required: true,
      secret: true,
    },
    {
      key: 'token',
      label: 'Token',
      type: 'password',
      placeholder: 'Your Trello token',
      required: true,
      secret: true,
    },
  ],

  configSchema: z.object({
    apiKey: z.string().min(1),
    token: z.string().min(1),
  }),

  tools: [
    {
      name: 'trello_list_boards',
      description: 'List all Trello boards the user has access to. Returns board IDs and names.',
      inputSchema: z.object({}),
      handler: async (args, config) => {
        const res = await fetch(
          `https://api.trello.com/1/members/me/boards?key=${config.apiKey}&token=${config.token}`
        )
        if (!res.ok) throw new Error(`Trello API error: ${res.status}`)
        return await res.json()
      },
    },
    {
      name: 'trello_create_card',
      description: 'Create a new card on a Trello list. Requires the list ID and card name.',
      inputSchema: z.object({
        listId: z.string().describe('The ID of the Trello list to add the card to'),
        name: z.string().describe('The title of the card'),
        desc: z.string().optional().describe('Optional description for the card'),
      }),
      handler: async (args, config) => {
        const { listId, name, desc } = args as { listId: string; name: string; desc?: string }
        const params = new URLSearchParams({
          key: config.apiKey,
          token: config.token,
          idList: listId,
          name,
          ...(desc && { desc }),
        })
        const res = await fetch(`https://api.trello.com/1/cards?${params}`, { method: 'POST' })
        if (!res.ok) throw new Error(`Trello API error: ${res.status}`)
        return await res.json()
      },
    },
  ],

  testConnection: async (config) => {
    try {
      const res = await fetch(
        `https://api.trello.com/1/members/me?key=${config.apiKey}&token=${config.token}`
      )
      if (res.ok) return { ok: true }
      return { ok: false, message: 'Invalid API key or token' }
    } catch {
      return { ok: false, message: 'Could not reach Trello' }
    }
  },
}
```

**Build all four initial connectors** (Trello, Twist, Google Drive, Pipedrive) following this exact pattern. Each gets its own directory. Each exports one named constant.

**Definition of done:** Registry exports all four connectors. Each has at least 2 tools implemented. Each has a working `testConnection` function. TypeScript strict mode passes.

---

## Module 5 — Credential Encryption

**Goal:** A clean, tested encryption utility. Config values are never stored in plaintext.

`src/lib/crypto.ts`:

```typescript
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_VERSION = process.env.ENCRYPTION_KEY_VERSION ?? '1'

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY
  if (!hex || hex.length !== 64) throw new Error('ENCRYPTION_KEY must be a 64-char hex string')
  return Buffer.from(hex, 'hex')
}

export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(12)  // 96-bit IV for GCM
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  // Format: version:iv_hex:tag_hex:ciphertext_hex
  return `${KEY_VERSION}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decrypt(stored: string): string {
  const [version, ivHex, tagHex, ciphertextHex] = stored.split(':')
  // TODO: support multiple key versions for rotation
  if (version !== KEY_VERSION) throw new Error(`Unknown encryption key version: ${version}`)
  const key = getKey()
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const ciphertext = Buffer.from(ciphertextHex, 'hex')
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(ciphertext) + decipher.final('utf8')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function generateToken(): string {
  return randomBytes(32).toString('hex')  // 64-char hex — opaque Bearer token
}
```

Write unit tests for encrypt/decrypt round-trip. Test that wrong keys and tampered ciphertexts throw. Use Node's built-in `test` runner (`node --test`).

**Definition of done:** `encrypt(decrypt(x)) === x` for arbitrary strings. Tampered ciphertext throws. Tests pass.

---

## Module 6 — MCP Gateway (Multi-Tenant Protocol Layer)

**Goal:** A single HTTP endpoint at `/mcp` that accepts MCP JSON-RPC 2.0 requests, resolves the requesting user from their Bearer token, loads their enabled connectors, and routes tool calls to the correct handler with decrypted credentials.

**This is the core of the product. Get the protocol right.**

### MCP Protocol Summary (as of April 2026)

MCP uses JSON-RPC 2.0 over HTTP with Server-Sent Events (SSE) for streaming.

The lifecycle:
1. Client connects to `/mcp` — receives SSE stream
2. Client sends `initialize` request — server responds with capabilities
3. Client sends `tools/list` — server returns all tools for this user's enabled connectors
4. Client sends `tools/call` with tool name + args — server executes handler, returns result
5. Connection closes when client disconnects

**`src/lib/mcp/types.ts`:**

```typescript
export interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: string | number | null
  method: string
  params?: unknown
}

export interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: string | number | null
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

export interface McpTool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

export interface McpServerCapabilities {
  tools?: { listChanged?: boolean }
}
```

**`src/lib/mcp/gateway.ts`:**

```typescript
// Core gateway logic:

// 1. resolveUser(authHeader: string): Promise<User | null>
//    - Extract Bearer token from Authorization header
//    - Hash it, look up in oauth_tokens, check expiry
//    - Return User or null

// 2. getEnabledTools(userId: string): Promise<McpTool[]>
//    - Load user's enabled connector configs from DB
//    - For each enabled connector, get its tools from the registry
//    - Return MCP-format tool list (with JSON Schema from Zod schemas)
//    - Use zod-to-json-schema to convert Zod schemas

// 3. executeTool(userId: string, toolName: string, args: unknown): Promise<unknown>
//    - Find which connector owns this tool (by tool name prefix convention)
//    - Load and decrypt that connector's config for this user
//    - Call the tool handler with args + decrypted config
//    - Return result or throw structured error

// 4. handleJsonRpc(request: JsonRpcRequest, userId: string): Promise<JsonRpcResponse>
//    - Route by method:
//      - 'initialize' → return server info + capabilities
//      - 'tools/list' → return getEnabledTools()
//      - 'tools/call' → return executeTool()
//      - anything else → return method-not-found error
```

**`src/app/mcp/route.ts`:**

```typescript
// This is the single MCP endpoint
// Implement as a Next.js Route Handler that:
// 1. Validates Authorization header (Bearer token)
// 2. Resolves user via gateway.resolveUser()
// 3. Returns 401 if no valid token
// 4. For GET requests: return SSE stream
// 5. For POST requests: parse JSON-RPC body, handle, return JSON response
// Use the Web Streams API for SSE (Response with ReadableStream)
```

**Note on tool naming:** Tools must be named with their connector prefix: `trello_create_card`, not just `create_card`. This allows the gateway to route `tools/call` requests without a lookup table — just split on first underscore.

**Add `zod-to-json-schema` package:** `pnpm add zod-to-json-schema`. Use it to convert connector tool `inputSchema` (Zod) to JSON Schema for the `tools/list` response.

**Definition of done:** Using a raw MCP client (e.g., `@modelcontextprotocol/sdk` in a test script), connect to `/mcp` with a valid Bearer token, call `tools/list`, and see the correct tools for that user's enabled connectors. Call a tool and get a real response.

---

## Module 7 — User-Facing Connector UI

**Goal:** Users can see all available connectors, enable/disable them, configure credentials, and test connections. Every interaction feels fast and intentional.

### App Shell

`src/app/(app)/layout.tsx`:
- Left sidebar, ~220px wide, dark (near-black background)
- Logo/wordmark top-left
- Navigation items: Connectors (primary), Settings
- User avatar + name at bottom with a dropdown
- Main content area: white or very light grey, full height
- Sidebar is fixed. Content scrolls.

### Connector List Page — `/connectors`

`src/app/(app)/connectors/page.tsx`:

Design:
- Page title: "Connectors" — large, clean heading
- Subtitle: "Connect your tools to your AI assistant."
- Grid of connector cards (3 columns on desktop, 1 on mobile)

Each connector card:
- Icon top-left (48px, subtle)
- Connector name (bold, medium)
- One-line description
- Status badge: "Active" (green dot + text) or "Not configured" (grey)
- Toggle (shadcn Switch component) — right side
- Clicking the card or clicking "Configure" opens the config panel
- Toggling off: immediate, with undo toast for 5 seconds

### Connector Config Panel

Opens as a right-side sheet (shadcn Sheet component) — slides in from right, 420px wide.

Content:
- Connector name + icon as header
- Description
- Status indicator (configured / not configured)
- Form fields (generated from `connector.configFields`)
  - Password/secret fields show a lock icon and "••••••••" if already saved — never return the plaintext value
  - "Update" button appears only if a secret field is changed
- "Test connection" button — calls `testConnection`, shows inline success/error state
- "Save" button — saves config, logs audit event
- "Remove credentials" — dangerous action, confirm dialog

Secret field behaviour: if a user has saved credentials, show the field as `••••••••` with a small "Change" link. If they click "Change", the field clears and accepts new input. This ensures secrets are never returned to the UI.

### Settings Page — `/settings`

Minimal. For now:
- Display name (read-only from Google)
- Email (read-only)
- "Sign out" button

**Definition of done:** A logged-in user can enable Trello, fill in their API key, hit "Test connection" (gets success), save, and confirm that the config is stored encrypted in the DB. Toggle off removes enabled state but preserves config.

---

## Module 8 — Admin Panel

**Goal:** Admins have complete visibility and control over the org's connector setup.

### Admin Shell

`src/app/admin/layout.tsx`:
- Same sidebar pattern as app shell, but with admin-specific nav items
- Add visual indicator that this is admin mode (e.g., subtle "Admin" badge on sidebar header)
- Redirect non-admin users to `/connectors` with a toast: "You don't have admin access."

### User List — `/admin/users`

- Table: Avatar, Name, Email, Role, Connectors (count of enabled), Last active
- Search/filter by name or email
- Click a row → user detail page
- Role badge: "Admin" (accent colour) or "Member" (grey)

### User Detail — `/admin/users/[id]`

- User profile summary at top
- Connector status list: all connectors, with each user's enabled state + configured state
- "Configure on behalf" button per connector → opens same config panel as user-facing UI, but saves for that user and logs an audit event with `actorId = admin, targetUserId = user`
- Role toggle: Member ↔ Admin (with confirmation dialog)

### Admin Connector Registry — `/admin/connectors`

Read-only view for now (registry is code-based). Shows:
- All connectors in the registry
- Status per connector (active/beta/deprecated)
- Number of users who have it enabled
- Tool count per connector

### Admin Settings — `/admin/settings`

This is where Claude org setup is configured.

- Section: "MCP Server URL" — shows `https://yourdomain.com/mcp` in a copyable code box. Instruction text: "Add this as a remote connector in your AI tool's organisation settings."
- Section: "OAuth Credentials" — generate Client ID + Client Secret for MCP clients
  - Shows existing client pairs (Client ID visible, Secret masked)
  - "Generate new credentials" button → creates new pair, shows Secret ONCE with a "Copy" button and a warning that it won't be shown again
  - "Revoke" button per credential pair

### Audit Log — `/admin/audit`

- Table: Timestamp, Actor, Action, Target User, Details
- Filterable by date range and action type
- `detail` jsonb column rendered as expandable JSON
- Actions use human-readable labels: "Connector enabled", "Config updated by admin", "OAuth token issued"

**Definition of done:** Admin can view all users, configure connectors on behalf of a user (with audit trail), generate OAuth credentials, and copy the MCP server URL. Audit log shows all events correctly.

---

## Module 9 — Error Handling, Polish, and Production Readiness

**Goal:** The product feels complete. Errors are handled gracefully. The app is ready to deploy.

### Error Handling

- All API routes return structured JSON errors: `{ error: { code: string, message: string } }`
- MCP gateway errors return valid JSON-RPC error objects
- Tool handler errors are caught and returned as MCP error responses (not 500s)
- Client-side: react-error-boundary wraps page content, with a tasteful error state
- Toast notifications for all async actions (success and failure)

### Loading States

- Every async action has a loading state (button spinner, skeleton loaders on tables)
- Use React Suspense boundaries with skeleton components for page-level loading
- Connector list shows skeleton cards while loading
- Table rows show skeleton while paginating

### Empty States

Every list or table that can be empty has a designed empty state:
- Connector list with 0 connectors configured: icon + "No connectors enabled yet." + call to action
- Audit log with no entries: "No events recorded yet."
- Admin user list loading first user: cannot be empty (admin always exists)

### Production Docker

Write `docker-compose.prod.yml`:
- App container (production build)
- PostgreSQL with volume persistence
- Caddy or nginx as reverse proxy with automatic HTTPS (if Caddy: one-line config)

### Environment Validation

On app startup, validate all required env vars are present and correctly formatted. If not, throw with a clear message listing what's missing. Do this in `src/lib/env.ts` using Zod:

```typescript
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  ALLOWED_EMAIL_DOMAIN: z.string().min(1),
  ENCRYPTION_KEY: z.string().length(64),
  ENCRYPTION_KEY_VERSION: z.string().default('1'),
})

export const env = envSchema.parse(process.env)
```

Import `env` from this file everywhere you use `process.env`. This gives you type-safe environment variables throughout.

### Health Check Endpoint

`src/app/api/health/route.ts`:
- Returns `{ status: 'ok', db: 'ok' }` when DB is reachable
- Returns 503 if DB is down
- Used by Docker health checks

**Definition of done:** App builds with `pnpm build` and `docker compose -f docker-compose.prod.yml up`. All error paths show useful messages. Empty states are designed. Health check works.

---

## Connector Addition Guide (For Future Reference)

When adding a new connector after the initial four:

1. Create `src/connectors/[connector-id]/index.ts`
2. Export a `ConnectorDefinition` object following the pattern in Module 4
3. Add the import and array entry to `src/connectors/_registry.ts`
4. Run `pnpm type-check` — TypeScript will catch any schema violations
5. Test `testConnection` manually
6. Optionally add an icon to `public/icons/[connector-id].svg`

That's it. No database migrations. No changes to the gateway. No changes to the UI — the connector form is generated from `configFields` automatically.

---

## Blindspots — Things to Handle Upfront

**1. Token expiry and refresh**
OAuth tokens stored in `oauth_tokens` have an `expires_at`. The MCP gateway must check expiry on every request and return a proper `401 Unauthorized` if expired. MCP clients (Claude) will then prompt the user to re-authorise. Do not implement refresh tokens in v1 — just 90-day expiry with forced re-auth.

**2. Connector config migration**
If a connector's `configSchema` changes (e.g., a new required field is added), existing users have stored configs that are missing that field. Handle this in the tool handler: if a required field is missing from the decrypted config, return a friendly MCP error: "Your [Connector] configuration is incomplete. Please update it at [URL]." Do not crash the gateway.

**3. Concurrent config updates**
If an admin and a user both update the same connector config simultaneously, use `updatedAt` optimistic locking: send current `updatedAt` in the update request, reject if it doesn't match the DB value. Return a 409 Conflict with a message to refresh.

**4. Tool name collisions**
If two connectors define a tool with the same name, the gateway will behave unexpectedly. Enforce uniqueness at startup: on app init, iterate the full tool list across all connectors and throw if any name appears twice. This catches it immediately during development.

**5. Secret field "Change" UX**
When a user updates credentials, the old encrypted config must be overwritten entirely (not merged field-by-field) to avoid partial-credential states. Always re-encrypt the full config object on save.

**6. Admin self-demotion**
Prevent an admin from removing their own admin role. If they're the last admin, block the action. Require at least one admin at all times.

**7. Connector not found in registry**
A user may have a `user_connector_configs` row for a connector that no longer exists in the registry (deprecated/removed). The gateway must skip these gracefully during `tools/list` — don't crash, just filter them out. The admin UI should flag "orphaned configs" for cleanup.

**8. MCP SSE connection management**
SSE connections are long-lived. In production, set a reasonable timeout (e.g., 60s) and let the client reconnect. Don't try to maintain state across reconnects — MCP clients re-send `initialize` and `tools/list` after reconnecting, which is correct.

**9. Rate limiting**
Basic rate limiting on the `/mcp` endpoint and `/oauth/token` endpoint. Use a simple in-memory rate limiter (or Redis if you add it later). Limit to 100 requests/min per token. Return 429 with `Retry-After` header.

**10. The "test connection" button timing**
`testConnection` makes an external API call. It can be slow. Run it as a POST to an API route (`/api/connectors/[id]/test`), show a loading spinner, and timeout after 10 seconds. Never block the UI.

---

## Coding Standards

- All files: TypeScript strict mode. No `any`.
- All API routes: validate request body with Zod before processing
- All database queries: use Drizzle typed queries — no raw SQL unless absolutely necessary
- All errors: throw with typed Error subclasses where needed, never throw plain strings
- All async operations: handle errors at the call site — no unhandled promise rejections
- Component files: named exports, not default exports (except pages and layouts)
- Utility functions: pure where possible, tested where critical
- No `console.log` in production — use a structured logger or just remove
- Commit messages: imperative, lowercase, descriptive: `add trello connector`, `fix oauth token expiry check`

---

## Starting Instructions for Claude Code

1. Read this entire file first.
2. Initialise the project (Module 0).
3. Confirm the structure matches the directory layout above.
4. Proceed through modules in order.
5. At the end of each module, confirm the "Definition of done" criteria before starting the next.
6. Ask for clarification if a design decision is ambiguous — don't guess on security-sensitive code (encryption, OAuth, token handling).
7. The product name is TBD — use `[Product]` as a placeholder in UI text for now. Carlton will decide.

Build it like it will be used by thousands of teams. Even though it's a side project, the architecture decisions made here are permanent.
