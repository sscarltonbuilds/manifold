import { pgTable, uuid, text, timestamp, boolean, jsonb, pgEnum, uniqueIndex, integer, bigint, primaryKey } from 'drizzle-orm/pg-core'

export const userRoleEnum       = pgEnum('user_role',        ['member', 'admin'])
export const connectorStatusEnum = pgEnum('connector_status', ['pending', 'active', 'deprecated'])
export const authTypeEnum        = pgEnum('auth_type',        ['api_key', 'oauth2', 'bearer_token', 'admin_managed', 'none'])
export const managedByEnum       = pgEnum('managed_by',       ['user', 'admin'])

export const users = pgTable('users', {
  id:           uuid('id').primaryKey().defaultRandom(),
  email:        text('email').notNull().unique(),
  name:         text('name').notNull(),
  avatarUrl:    text('avatar_url'),
  role:         userRoleEnum('role').notNull().default('member'),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  lastActiveAt: timestamp('last_active_at'),
})

// Connectors registered in the platform — backed by manifold.json manifests
export const connectors = pgTable('connectors', {
  id:                text('id').primaryKey(),              // kebab-case, e.g. "pipedrive"
  name:              text('name').notNull(),
  description:       text('description').notNull(),
  iconUrl:           text('icon_url'),
  version:           text('version').notNull(),
  status:            connectorStatusEnum('status').notNull().default('pending'),
  endpoint:          text('endpoint').notNull(),           // MCP server URL
  authType:          authTypeEnum('auth_type').notNull(),
  managedBy:         managedByEnum('managed_by').notNull().default('user'),
  manifest:          jsonb('manifest').notNull(),          // Full parsed manifold.json
  discoveredTools:   jsonb('discovered_tools'),            // Cached result of tools/list
  toolsDiscoveredAt: timestamp('tools_discovered_at'),
  toolsChangedAt:    timestamp('tools_changed_at'),        // Set when tool list changes on refresh
  healthStatus:      text('health_status'),                // 'healthy' | 'unreachable' | null
  lastHealthCheck:   timestamp('last_health_check'),
  submittedBy:       uuid('submitted_by').references(() => users.id),
  approvedBy:        uuid('approved_by').references(() => users.id),
  createdAt:         timestamp('created_at').notNull().defaultNow(),
  updatedAt:         timestamp('updated_at').notNull().defaultNow(),
})

// Admin-level credentials for admin_managed connectors
export const connectorAdminConfigs = pgTable('connector_admin_configs', {
  id:                   uuid('id').primaryKey().defaultRandom(),
  connectorId:          text('connector_id').notNull().references(() => connectors.id, { onDelete: 'cascade' }),
  encryptedConfig:      text('encrypted_config').notNull(),
  encryptionKeyVersion: text('encryption_key_version').notNull().default('1'),
  configHmac:           text('config_hmac'),
  updatedAt:            timestamp('updated_at').notNull().defaultNow(),
})

// Per-user credentials for user-managed connectors
export const userConnectorConfigs = pgTable('user_connector_configs', {
  id:                   uuid('id').primaryKey().defaultRandom(),
  userId:               uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  connectorId:          text('connector_id').notNull().references(() => connectors.id, { onDelete: 'cascade' }),
  encryptedConfig:      text('encrypted_config').notNull(),
  encryptionKeyVersion: text('encryption_key_version').notNull().default('1'),
  configHmac:           text('config_hmac'),
  enabled:              boolean('enabled').notNull().default(false),
  updatedAt:            timestamp('updated_at').notNull().defaultNow(),
}, t => [uniqueIndex('uq_user_connector').on(t.userId, t.connectorId)])

// Admin fine-grained controls per connector
export const connectorPolicies = pgTable('connector_policies', {
  id:               uuid('id').primaryKey().defaultRandom(),
  connectorId:      text('connector_id').notNull().references(() => connectors.id, { onDelete: 'cascade' }),
  required:         boolean('required').notNull().default(false),
  visibleToRoles:   jsonb('visible_to_roles').notNull().default(['member', 'admin']),
  disabledTools:    jsonb('disabled_tools').notNull().default([]),
  rateLimitPerHour: jsonb('rate_limit_per_hour'),
  logToolCalls:     boolean('log_tool_calls').notNull().default(true),
  updatedAt:        timestamp('updated_at').notNull().defaultNow(),
})

export const oauthTokens = pgTable('oauth_tokens', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  name:      text('name'),
  clientId:  text('client_id').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const oauthClients = pgTable('oauth_clients', {
  id:         uuid('id').primaryKey().defaultRandom(),
  clientId:   text('client_id').notNull().unique(),
  secretHash: text('secret_hash').notNull(),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
})

// Org-wide settings — key/value store
export const orgSettings = pgTable('org_settings', {
  key:       text('key').primaryKey(),
  value:     text('value').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const auditLogs = pgTable('audit_logs', {
  id:           uuid('id').primaryKey().defaultRandom(),
  actorId:      uuid('actor_id').notNull().references(() => users.id),
  targetUserId: uuid('target_user_id').references(() => users.id),
  connectorId:  text('connector_id').references(() => connectors.id, { onDelete: 'set null' }),
  action:       text('action').notNull(),
  detail:       jsonb('detail'),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
})

export const invitations = pgTable('invitations', {
  id:         uuid('id').primaryKey().defaultRandom(),
  email:      text('email').notNull(),
  role:       userRoleEnum('role').notNull().default('member'),
  token:      text('token').notNull().unique(),
  expiresAt:  timestamp('expires_at').notNull(),
  invitedBy:  uuid('invited_by').notNull().references(() => users.id),
  acceptedAt: timestamp('accepted_at'),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
})

export const bundles = pgTable('bundles', {
  id:          uuid('id').primaryKey().defaultRandom(),
  name:        text('name').notNull(),
  description: text('description').notNull().default(''),
  emoji:       text('emoji').notNull().default('📦'),
  createdBy:   uuid('created_by').references(() => users.id),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
  updatedAt:   timestamp('updated_at').notNull().defaultNow(),
})

export const bundleConnectors = pgTable('bundle_connectors', {
  bundleId:    uuid('bundle_id').notNull().references(() => bundles.id, { onDelete: 'cascade' }),
  connectorId: text('connector_id').notNull().references(() => connectors.id, { onDelete: 'cascade' }),
  required:    boolean('required').notNull().default(false),
}, t => [uniqueIndex('uq_bundle_connector').on(t.bundleId, t.connectorId)])

export const userBundles = pgTable('user_bundles', {
  userId:     uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  bundleId:   uuid('bundle_id').notNull().references(() => bundles.id, { onDelete: 'cascade' }),
  assignedBy: uuid('assigned_by').references(() => users.id),
  assignedAt: timestamp('assigned_at').notNull().defaultNow(),
}, t => [uniqueIndex('uq_user_bundle').on(t.userId, t.bundleId)])

export const adminApiKeys = pgTable('admin_api_keys', {
  id:         uuid('id').primaryKey().defaultRandom(),
  name:       text('name').notNull(),
  keyHash:    text('key_hash').notNull().unique(),
  createdBy:  uuid('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
  lastUsedAt: timestamp('last_used_at'),
})

export const connectorOAuthStates = pgTable('connector_oauth_states', {
  id:          uuid('id').primaryKey().defaultRandom(),
  state:       text('state').notNull().unique(),
  userId:      uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  connectorId: text('connector_id').notNull().references(() => connectors.id, { onDelete: 'cascade' }),
  expiresAt:   timestamp('expires_at').notNull(),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
})

export const connectorRequests = pgTable('connector_requests', {
  id:            uuid('id').primaryKey().defaultRandom(),
  userId:        uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  connectorId:   text('connector_id').references(() => connectors.id, { onDelete: 'set null' }),
  connectorName: text('connector_name'),
  message:       text('message'),
  status:        text('status').notNull().default('pending'),   // 'pending' | 'noted' | 'dismissed'
  createdAt:     timestamp('created_at').notNull().defaultNow(),
  updatedAt:     timestamp('updated_at').notNull().defaultNow(),
})

// Postgres-backed rate limiting — survives restarts, works across instances
export const rateLimitWindows = pgTable('rate_limit_windows', {
  key:         text('key').notNull(),
  windowStart: bigint('window_start', { mode: 'number' }).notNull(),
  count:       integer('count').notNull().default(1),
}, t => [primaryKey({ columns: [t.key, t.windowStart] })])

// Type exports
export type OrgSetting          = typeof orgSettings.$inferSelect
export type User                = typeof users.$inferSelect
export type Connector           = typeof connectors.$inferSelect
export type ConnectorAdminConfig = typeof connectorAdminConfigs.$inferSelect
export type UserConnectorConfig = typeof userConnectorConfigs.$inferSelect
export type ConnectorPolicy     = typeof connectorPolicies.$inferSelect
export type OAuthToken          = typeof oauthTokens.$inferSelect
export type OAuthClient         = typeof oauthClients.$inferSelect
export type AuditLog            = typeof auditLogs.$inferSelect
export type Invitation          = typeof invitations.$inferSelect
export type NewUser             = typeof users.$inferInsert
export type Bundle              = typeof bundles.$inferSelect
export type BundleConnector     = typeof bundleConnectors.$inferSelect
export type UserBundle          = typeof userBundles.$inferSelect
export type AdminApiKey         = typeof adminApiKeys.$inferSelect
export type ConnectorOAuthState = typeof connectorOAuthStates.$inferSelect
export type ConnectorRequest    = typeof connectorRequests.$inferSelect
