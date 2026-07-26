CREATE TABLE `sales` (
	`id` text PRIMARY KEY NOT NULL,
	`receipt_number` text NOT NULL,
	`sold_by` text NOT NULL,
	`sold_at` text DEFAULT (datetime('now')) NOT NULL,
	`visit_date` text NOT NULL,
	`total_amount` integer NOT NULL,
	`total_quantity` integer NOT NULL,
	`status` text DEFAULT 'completed' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`sold_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sales_receipt_number_unique` ON `sales` (`receipt_number`);--> statement-breakpoint
CREATE INDEX `sales_sold_at_idx` ON `sales` (`sold_at`);--> statement-breakpoint
CREATE INDEX `sales_sold_by_idx` ON `sales` (`sold_by`);--> statement-breakpoint
CREATE INDEX `sales_visit_date_idx` ON `sales` (`visit_date`);--> statement-breakpoint
CREATE TABLE `sale_items` (
	`id` text PRIMARY KEY NOT NULL,
	`sale_id` text NOT NULL,
	`ticket_product_id` text NOT NULL,
	`product_name` text NOT NULL,
	`visitor_category` text NOT NULL,
	`unit_price` integer NOT NULL,
	`quantity` integer NOT NULL,
	`subtotal` integer NOT NULL,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ticket_product_id`) REFERENCES `ticket_products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sale_items_sale_idx` ON `sale_items` (`sale_id`);--> statement-breakpoint
CREATE INDEX `sale_items_product_idx` ON `sale_items` (`ticket_product_id`);