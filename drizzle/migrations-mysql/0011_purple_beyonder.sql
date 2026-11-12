ALTER TABLE `workspaces` ADD `stripe_customer_id` longtext;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `stripe_subscription_id` longtext;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `stripe_price_id` longtext;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `current_period_end` bigint;