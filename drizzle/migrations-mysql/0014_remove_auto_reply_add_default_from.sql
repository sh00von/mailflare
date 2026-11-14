DROP TABLE IF EXISTS `auto_reply_deliveries`;--> statement-breakpoint
ALTER TABLE `mailboxes` ADD `default_from` text;--> statement-breakpoint
ALTER TABLE `mailboxes` DROP COLUMN `auto_reply_enabled`;--> statement-breakpoint
ALTER TABLE `mailboxes` DROP COLUMN `auto_reply_subject`;--> statement-breakpoint
ALTER TABLE `mailboxes` DROP COLUMN `auto_reply_body`;
