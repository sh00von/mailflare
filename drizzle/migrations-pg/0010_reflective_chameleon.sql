CREATE TABLE "workspaces" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"owner_user_id" text,
	"plan" text DEFAULT 'starter' NOT NULL,
	"status" text DEFAULT 'trialing' NOT NULL,
	"trial_ends_at" bigint,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_settings" ALTER COLUMN "app_name" SET DEFAULT 'Replyot';--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN "workspace_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "workspace_id" text;--> statement-breakpoint
CREATE INDEX "workspaces_owner_idx" ON "workspaces" USING btree ("owner_user_id");--> statement-breakpoint
ALTER TABLE "domains" ADD CONSTRAINT "domains_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "domains_workspace_idx" ON "domains" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "users_workspace_idx" ON "users" USING btree ("workspace_id");