CREATE TABLE `facility_status` (
	`id` text PRIMARY KEY NOT NULL,
	`facility_id` text NOT NULL,
	`date` text NOT NULL,
	`status` text DEFAULT 'operational' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`recorded_by` text NOT NULL,
	`recorded_at` text NOT NULL,
	FOREIGN KEY (`facility_id`) REFERENCES `config_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recorded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `facility_status_facility_date_idx` ON `facility_status` (`facility_id`,`date`);