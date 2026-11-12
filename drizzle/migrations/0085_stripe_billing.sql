ALTER TABLE `workspaces` ADD `stripe_customer_id` text;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `stripe_subscription_id` text;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `stripe_price_id` text;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `current_period_end` integer;

