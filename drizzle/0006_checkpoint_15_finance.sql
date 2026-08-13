CREATE TABLE `cash_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`opened_by` text NOT NULL,
	`opened_at` text NOT NULL,
	`closed_by` text,
	`closed_at` text,
	`declared_cash` integer,
	`system_cash` integer,
	`difference` integer,
	`status` text DEFAULT 'open' NOT NULL,
	FOREIGN KEY (`opened_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`closed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `cash_sessions_status_idx` ON `cash_sessions` (`status`);--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`description` text NOT NULL,
	`amount` integer NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`entry_date` text NOT NULL,
	`recorded_by` text NOT NULL,
	`recorded_at` text DEFAULT (datetime('now')) NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`approved_by` text,
	`approved_at` text,
	FOREIGN KEY (`recorded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `expenses_date_idx` ON `expenses` (`entry_date`);--> statement-breakpoint
CREATE INDEX `expenses_status_idx` ON `expenses` (`status`);--> statement-breakpoint
CREATE TABLE `revenue_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`source_key` text NOT NULL,
	`source_name` text NOT NULL,
	`amount` integer NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`entry_date` text NOT NULL,
	`recorded_by` text NOT NULL,
	`recorded_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`recorded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `revenue_entries_date_idx` ON `revenue_entries` (`entry_date`);--> statement-breakpoint
CREATE INDEX `revenue_entries_by_idx` ON `revenue_entries` (`recorded_by`);