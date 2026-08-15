CREATE TABLE `operations_checklist` (
	`id` text PRIMARY KEY NOT NULL,
	`checklist_id` text NOT NULL,
	`date` text NOT NULL,
	`done` integer DEFAULT false NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`recorded_by` text NOT NULL,
	`recorded_at` text NOT NULL,
	FOREIGN KEY (`checklist_id`) REFERENCES `config_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recorded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `operations_checklist_item_date_idx` ON `operations_checklist` (`checklist_id`,`date`);