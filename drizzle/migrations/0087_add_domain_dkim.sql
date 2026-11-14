ALTER TABLE `domains` ADD `dkim_private_key` text;--> statement-breakpoint
ALTER TABLE `domains` ADD `dkim_public_key` text;--> statement-breakpoint
ALTER TABLE `domains` ADD `dkim_selector` text DEFAULT 'default';

