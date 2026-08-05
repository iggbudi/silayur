CREATE TABLE `ticket_products` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`visitor_category` text NOT NULL,
	`validity_mode` text DEFAULT 'same_day' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ticket_products_code_idx` ON `ticket_products` (`code`);
--> statement-breakpoint
CREATE TABLE `ticket_prices` (
	`id` text PRIMARY KEY NOT NULL,
	`ticket_product_id` text NOT NULL,
	`day_type` text NOT NULL,
	`price` integer NOT NULL,
	`valid_from` text NOT NULL,
	`valid_until` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`ticket_product_id`) REFERENCES `ticket_products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ticket_prices_product_day_idx` ON `ticket_prices` (`ticket_product_id`,`day_type`,`valid_from`);
