CREATE TABLE `suppression_list` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text REFERENCES workspaces(id) ON DELETE cascade,
	`email` text NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`bounce_code` text,
	`bounce_count` integer DEFAULT 1 NOT NULL,
	`details` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `suppression_list_email_idx` ON `suppression_list` (`email`,`status`);--> statement-breakpoint
CREATE INDEX `suppression_list_workspace_idx` ON `suppression_list` (`workspace_id`,`email`);
