ALTER TABLE `workspaces` ADD `max_mailboxes` integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `billing_cycle` text DEFAULT '12m' NOT NULL;

