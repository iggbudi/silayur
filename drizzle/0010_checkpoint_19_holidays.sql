CREATE TABLE `holidays` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `holidays_date_unique` ON `holidays` (`date`);