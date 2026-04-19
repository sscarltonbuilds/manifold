ALTER TABLE "connector_policies" ADD COLUMN "log_tool_calls" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "connectors" ADD COLUMN "tools_changed_at" timestamp;--> statement-breakpoint
ALTER TABLE "connectors" ADD COLUMN "health_status" text;--> statement-breakpoint
ALTER TABLE "connectors" ADD COLUMN "last_health_check" timestamp;