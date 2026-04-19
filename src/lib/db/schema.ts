import { pgTable, uuid, text, timestamp, boolean, jsonb, pgEnum, uniqueIndex } from 'drizzle-orm/pg-core'

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
export type NewUser             = typeof users.$inferInsert
