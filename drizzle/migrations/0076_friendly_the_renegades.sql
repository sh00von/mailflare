DROP TABLE `agent_chat_messages`;--> statement-breakpoint
DROP TABLE `agent_conversations`;--> statement-breakpoint
DROP TABLE `agent_draft_metadata`;--> statement-breakpoint
DROP TABLE `agent_jobs`;--> statement-breakpoint
DROP TABLE `agent_send_approvals`;--> statement-breakpoint
DROP TABLE `ai_usage`;--> statement-breakpoint
DROP TABLE `license_settings`;--> statement-breakpoint
DROP TABLE `mailbox_agent_settings`;--> statement-breakpoint
DROP TABLE `mcp_key_mailboxes`;--> statement-breakpoint
ALTER TABLE `api_keys` ADD `key_sha256` text;--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_key_sha256_idx` ON `api_keys` (`key_sha256`);--> statement-breakpoint
ALTER TABLE `messages` ADD `has_unsubscribe` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `calendar_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `drive_enabled` integer DEFAULT true NOT NULL;