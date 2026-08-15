CREATE TABLE "complaint_history" (
	"id" text PRIMARY KEY NOT NULL,
	"complaint_id" text NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"changed_by" text NOT NULL,
	"changed_at" text NOT NULL,
	"note" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "complaint_history" ADD CONSTRAINT "complaint_history_complaint_id_complaints_id_fk" FOREIGN KEY ("complaint_id") REFERENCES "public"."complaints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint_history" ADD CONSTRAINT "complaint_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "complaint_history_complaint_idx" ON "complaint_history" USING btree ("complaint_id");