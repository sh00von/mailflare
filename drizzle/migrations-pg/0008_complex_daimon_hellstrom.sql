ALTER TABLE "agent_chat_messages" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "agent_conversations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "agent_draft_metadata" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "agent_jobs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "agent_send_approvals" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ai_usage" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "license_settings" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "mailbox_agent_settings" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "mcp_key_mailboxes" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "agent_chat_messages" CASCADE;--> statement-breakpoint
DROP TABLE "agent_conversations" CASCADE;--> statement-breakpoint
DROP TABLE "agent_draft_metadata" CASCADE;--> statement-breakpoint
DROP TABLE "agent_jobs" CASCADE;--> statement-breakpoint
DROP TABLE "agent_send_approvals" CASCADE;--> statement-breakpoint
DROP TABLE "ai_usage" CASCADE;--> statement-breakpoint
DROP TABLE "license_settings" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "mailbox_agent_settings" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "mcp_key_mailboxes" CASCADE;