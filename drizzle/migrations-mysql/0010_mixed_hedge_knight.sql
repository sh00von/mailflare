CREATE TABLE `workspaces` (
	`id` varchar(191) NOT NULL,
	`name` longtext NOT NULL,
	`owner_user_id` varchar(191),
	`plan` varchar(64) NOT NULL DEFAULT 'starter',
	`status` varchar(64) NOT NULL DEFAULT 'trialing',
	`trial_ends_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `workspaces_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `app_settings` MODIFY COLUMN `app_name` longtext NOT NULL DEFAULT ('Replyot');--> statement-breakpoint
ALTER TABLE `domains` ADD `workspace_id` varchar(191);--> statement-breakpoint
ALTER TABLE `users` ADD `workspace_id` varchar(191);--> statement-breakpoint
CREATE INDEX `workspaces_owner_idx` ON `workspaces` (`owner_user_id`);--> statement-breakpoint
ALTER TABLE `domains` ADD CONSTRAINT `domains_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `domains_workspace_idx` ON `domains` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `users_workspace_idx` ON `users` (`workspace_id`);