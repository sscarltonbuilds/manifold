-- Clear tables that reference connector IDs from the old TypeScript registry
-- (dev instance only — no real user data)
TRUNCATE TABLE "audit_logs";--> statement-breakpoint
TRUNCATE TABLE "user_connector_configs";--> statement-breakpoint
CREATE TYPE "public"."auth_type" AS ENUM('api_key', 'oauth2', 'bearer_token', 'admin_managed', 'none');--> statement-breakpoint
CREATE TYPE "public"."connector_status" AS ENUM('pending', 'active', 'deprecated');--> statement-breakpoint
CREATE TYPE "public"."managed_by" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "connector_admin_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connector_id" text NOT NULL,
	"encrypted_config" text NOT NULL,
	"encryption_key_version" text DEFAULT '1' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connector_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connector_id" text NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"visible_to_roles" jsonb DEFAULT '["member","admin"]'::jsonb NOT NULL,
	"disabled_tools" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rate_limit_per_hour" jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connectors" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"icon_url" text,
	"version" text NOT NULL,
	"status" "connector_status" DEFAULT 'pending' NOT NULL,
	"endpoint" text NOT NULL,
	"auth_type" "auth_type" NOT NULL,
	"managed_by" "managed_by" DEFAULT 'user' NOT NULL,
	"manifest" jsonb NOT NULL,
	"discovered_tools" jsonb,
	"tools_discovered_at" timestamp,
	"submitted_by" uuid,
	"approved_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "connector_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_active_at" timestamp;--> statement-breakpoint
ALTER TABLE "connector_admin_configs" ADD CONSTRAINT "connector_admin_configs_connector_id_connectors_id_fk" FOREIGN KEY ("connector_id") REFERENCES "public"."connectors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connector_policies" ADD CONSTRAINT "connector_policies_connector_id_connectors_id_fk" FOREIGN KEY ("connector_id") REFERENCES "public"."connectors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connectors" ADD CONSTRAINT "connectors_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connectors" ADD CONSTRAINT "connectors_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_connector_id_connectors_id_fk" FOREIGN KEY ("connector_id") REFERENCES "public"."connectors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_connector_configs" ADD CONSTRAINT "user_connector_configs_connector_id_connectors_id_fk" FOREIGN KEY ("connector_id") REFERENCES "public"."connectors"("id") ON DELETE cascade ON UPDATE no action;