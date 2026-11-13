export type BackupScheduleType = "daily" | "weekly" | "monthly";
export type BackupTableGroupId = "accounts" | "mail" | "automation" | "system";

export type DatabaseBackupTable = "workspaces" | "users" | "domains" | "domain_tracking_hosts" | "mailboxes" | "mailbox_access" | "contacts" | "folders" | "api_keys" | "messages" | "message_attachments" | "shared_attachment_links" | "outbound_jobs" | "message_tracking" | "message_opens" | "follow_ups" | "user_compose_preferences" | "routing_rules" | "webhooks" | "webhook_deliveries" | "sessions" | "audit_logs" | "backup_settings" | "backups" | "app_settings" | "email_templates" | "auto_reply_deliveries" | "spam_token_stats" | "spam_reputation" | "spam_feedback" | "mailbox_aliases" | "password_reset_tokens" | "mfa_recovery_codes" | "login_challenges" | "passkey_credentials";
export type DatabaseRecord = Record<string, string | number | null>;
export type DatabaseBackupDocument = { format: "replyot-database-backup" | "mailflare-database-backup"; version: 1 | 2; createdAt: string; includedTables?: DatabaseBackupTable[]; tables: Partial<Record<DatabaseBackupTable, DatabaseRecord[]>>; };
