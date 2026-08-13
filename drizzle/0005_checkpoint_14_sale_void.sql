ALTER TABLE `sales` ADD `void_reason` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `sales` ADD `void_requested_at` text;--> statement-breakpoint
ALTER TABLE `sales` ADD `void_requested_by` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `sales` ADD `voided_at` text;--> statement-breakpoint
ALTER TABLE `sales` ADD `voided_by` text REFERENCES users(id);