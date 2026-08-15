ALTER TABLE "revenue_entries" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "revenue_entries" ADD COLUMN "voided_by" text;--> statement-breakpoint
ALTER TABLE "revenue_entries" ADD COLUMN "voided_at" text;--> statement-breakpoint
ALTER TABLE "revenue_entries" ADD COLUMN "void_reason" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "revenue_entries" ADD CONSTRAINT "revenue_entries_voided_by_users_id_fk" FOREIGN KEY ("voided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;