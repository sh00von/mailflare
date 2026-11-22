CREATE TABLE `suppression_list` (
	`id` varchar(191) NOT NULL,
	`workspace_id` varchar(191),
	`email` varchar(191) NOT NULL,
	`reason` varchar(64) NOT NULL,
	`status` varchar(64) NOT NULL DEFAULT 'active',
	`bounce_code` varchar(64),
	`bounce_count` bigint NOT NULL DEFAULT 1,
	`details` longtext,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `suppression_list_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `suppression_list` ADD CONSTRAINT `suppression_list_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `suppression_list_email_idx` ON `suppression_list` (`email`,`status`);--> statement-breakpoint
CREATE INDEX `suppression_list_workspace_idx` ON `suppression_list` (`workspace_id`,`email`);
