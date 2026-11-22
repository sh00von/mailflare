CREATE TABLE "suppression_list" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text,
	"email" text NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"bounce_code" text,
	"bounce_count" bigint DEFAULT 1 NOT NULL,
	"details" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "suppression_list" ADD CONSTRAINT "suppression_list_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "suppression_list_email_idx" ON "suppression_list" USING btree ("email","status");--> statement-breakpoint
CREATE INDEX "suppression_list_workspace_idx" ON "suppression_list" USING btree ("workspace_id","email");
