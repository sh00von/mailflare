ALTER TABLE `domains` ADD `dkim_private_key` longtext;--> statement-breakpoint
ALTER TABLE `domains` ADD `dkim_public_key` longtext;--> statement-breakpoint
ALTER TABLE `domains` ADD `dkim_selector` varchar(191) DEFAULT 'default';
