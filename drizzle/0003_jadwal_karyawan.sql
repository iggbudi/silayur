CREATE TABLE "employees" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"position" text NOT NULL,
	"area" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT now() NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pic_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"date" text NOT NULL,
	"area" text NOT NULL,
	"task" text DEFAULT '' NOT NULL,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_shifts" (
	"id" text PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"date" text NOT NULL,
	"shift" text NOT NULL,
	"status" text DEFAULT 'hadir' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" text DEFAULT now() NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pic_assignments" ADD CONSTRAINT "pic_assignments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_shifts" ADD CONSTRAINT "schedule_shifts_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "employees_active_idx" ON "employees" USING btree ("active");--> statement-breakpoint
CREATE UNIQUE INDEX "pic_employee_date_area_idx" ON "pic_assignments" USING btree ("employee_id","date","area");--> statement-breakpoint
CREATE INDEX "pic_date_idx" ON "pic_assignments" USING btree ("date");--> statement-breakpoint
CREATE INDEX "pic_area_idx" ON "pic_assignments" USING btree ("area");--> statement-breakpoint
CREATE UNIQUE INDEX "schedule_employee_date_idx" ON "schedule_shifts" USING btree ("employee_id","date");--> statement-breakpoint
CREATE INDEX "schedule_date_idx" ON "schedule_shifts" USING btree ("date");--> statement-breakpoint
CREATE INDEX "schedule_shift_idx" ON "schedule_shifts" USING btree ("shift");