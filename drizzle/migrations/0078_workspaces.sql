CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`owner_user_id` text,
	`plan` text DEFAULT 'starter' NOT NULL,
	`status` text DEFAULT 'trialing' NOT NULL,
	`trial_ends_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `workspaces_owner_idx` ON `workspaces` (`owner_user_id`);--> statement-breakpoint
ALTER TABLE `domains` ADD `workspace_id` text REFERENCES workspaces(id) ON DELETE set null;--> statement-breakpoint
ALTER TABLE `users` ADD `workspace_id` text REFERENCES workspaces(id) ON DELETE set null;--> statement-breakpoint
CREATE INDEX `domains_workspace_idx` ON `domains` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `users_workspace_idx` ON `users` (`workspace_id`);

