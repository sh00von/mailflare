ALTER TABLE "domains" ADD COLUMN "dkim_private_key" text;--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN "dkim_public_key" text;--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN "dkim_selector" text DEFAULT 'default';
