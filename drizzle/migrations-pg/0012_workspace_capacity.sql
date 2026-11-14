ALTER TABLE "workspaces" ADD COLUMN "max_mailboxes" bigint DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "billing_cycle" text DEFAULT '12m' NOT NULL;

