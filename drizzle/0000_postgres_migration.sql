CREATE TABLE "auth_sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"created_at" text DEFAULT now() NOT NULL,
	"expires_at" text NOT NULL,
	"last_seen_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"opened_by" text NOT NULL,
	"opened_at" text NOT NULL,
	"closed_by" text,
	"closed_at" text,
	"declared_cash" integer,
	"system_cash" integer,
	"difference" integer,
	"status" text DEFAULT 'open' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "complaints" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"date" text NOT NULL,
	"reported_by" text NOT NULL,
	"reported_at" text NOT NULL,
	"updated_by" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "config_items" (
	"id" text PRIMARY KEY NOT NULL,
	"section" text NOT NULL,
	"name" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" text DEFAULT now() NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" text PRIMARY KEY NOT NULL,
	"description" text NOT NULL,
	"amount" integer NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"entry_date" text NOT NULL,
	"recorded_by" text NOT NULL,
	"recorded_at" text DEFAULT now() NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"approved_by" text,
	"approved_at" text
);
--> statement-breakpoint
CREATE TABLE "facility_status" (
	"id" text PRIMARY KEY NOT NULL,
	"facility_id" text NOT NULL,
	"date" text NOT NULL,
	"status" text DEFAULT 'operational' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"recorded_by" text NOT NULL,
	"recorded_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "holidays" (
	"id" text PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" text DEFAULT now() NOT NULL,
	CONSTRAINT "holidays_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "modules" (
	"key" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operations_checklist" (
	"id" text PRIMARY KEY NOT NULL,
	"checklist_id" text NOT NULL,
	"date" text NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"recorded_by" text NOT NULL,
	"recorded_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipt_counters" (
	"counter_date" text PRIMARY KEY NOT NULL,
	"seq" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revenue_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"source_key" text NOT NULL,
	"source_name" text NOT NULL,
	"amount" integer NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"entry_date" text NOT NULL,
	"recorded_by" text NOT NULL,
	"recorded_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_key" text NOT NULL,
	"module_key" text NOT NULL,
	"access" text DEFAULT 'none' NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL,
	CONSTRAINT "role_permissions_role_key_module_key_pk" PRIMARY KEY("role_key","module_key")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"key" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"system" boolean DEFAULT false NOT NULL,
	"created_at" text DEFAULT now() NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sale_items" (
	"id" text PRIMARY KEY NOT NULL,
	"sale_id" text NOT NULL,
	"ticket_product_id" text NOT NULL,
	"product_name" text NOT NULL,
	"visitor_category" text NOT NULL,
	"unit_price" integer NOT NULL,
	"quantity" integer NOT NULL,
	"subtotal" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" text PRIMARY KEY NOT NULL,
	"receipt_number" text NOT NULL,
	"sold_by" text NOT NULL,
	"sold_at" text DEFAULT now() NOT NULL,
	"visit_date" text NOT NULL,
	"total_amount" integer NOT NULL,
	"total_quantity" integer NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"void_reason" text DEFAULT '' NOT NULL,
	"void_requested_at" text,
	"void_requested_by" text,
	"voided_at" text,
	"voided_by" text,
	CONSTRAINT "sales_receipt_number_unique" UNIQUE("receipt_number")
);
--> statement-breakpoint
CREATE TABLE "schema_version" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"applied_at" text DEFAULT now() NOT NULL,
	"notes" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_prices" (
	"id" text PRIMARY KEY NOT NULL,
	"ticket_product_id" text NOT NULL,
	"day_type" text NOT NULL,
	"price" integer NOT NULL,
	"valid_from" text NOT NULL,
	"valid_until" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT now() NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_products" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"visitor_category" text NOT NULL,
	"validity_mode" text DEFAULT 'same_day' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT now() NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"username" text NOT NULL,
	"role_key" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"password_hash" text,
	"created_at" text DEFAULT now() NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_opened_by_users_id_fk" FOREIGN KEY ("opened_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_reported_by_users_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facility_status" ADD CONSTRAINT "facility_status_facility_id_config_items_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."config_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facility_status" ADD CONSTRAINT "facility_status_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holidays" ADD CONSTRAINT "holidays_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations_checklist" ADD CONSTRAINT "operations_checklist_checklist_id_config_items_id_fk" FOREIGN KEY ("checklist_id") REFERENCES "public"."config_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations_checklist" ADD CONSTRAINT "operations_checklist_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_entries" ADD CONSTRAINT "revenue_entries_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_key_roles_key_fk" FOREIGN KEY ("role_key") REFERENCES "public"."roles"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_ticket_product_id_ticket_products_id_fk" FOREIGN KEY ("ticket_product_id") REFERENCES "public"."ticket_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_sold_by_users_id_fk" FOREIGN KEY ("sold_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_void_requested_by_users_id_fk" FOREIGN KEY ("void_requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_voided_by_users_id_fk" FOREIGN KEY ("voided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_prices" ADD CONSTRAINT "ticket_prices_ticket_product_id_ticket_products_id_fk" FOREIGN KEY ("ticket_product_id") REFERENCES "public"."ticket_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_key_roles_key_fk" FOREIGN KEY ("role_key") REFERENCES "public"."roles"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_sessions_user_idx" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cash_sessions_status_idx" ON "cash_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "complaints_status_idx" ON "complaints" USING btree ("status");--> statement-breakpoint
CREATE INDEX "config_items_section_sort_idx" ON "config_items" USING btree ("section","sort_order");--> statement-breakpoint
CREATE INDEX "expenses_date_idx" ON "expenses" USING btree ("entry_date");--> statement-breakpoint
CREATE INDEX "expenses_status_idx" ON "expenses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "facility_status_facility_date_idx" ON "facility_status" USING btree ("facility_id","date");--> statement-breakpoint
CREATE INDEX "operations_checklist_item_date_idx" ON "operations_checklist" USING btree ("checklist_id","date");--> statement-breakpoint
CREATE INDEX "revenue_entries_date_idx" ON "revenue_entries" USING btree ("entry_date");--> statement-breakpoint
CREATE INDEX "revenue_entries_by_idx" ON "revenue_entries" USING btree ("recorded_by");--> statement-breakpoint
CREATE INDEX "sale_items_sale_idx" ON "sale_items" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "sale_items_product_idx" ON "sale_items" USING btree ("ticket_product_id");--> statement-breakpoint
CREATE INDEX "sales_sold_at_idx" ON "sales" USING btree ("sold_at");--> statement-breakpoint
CREATE INDEX "sales_sold_by_idx" ON "sales" USING btree ("sold_by");--> statement-breakpoint
CREATE INDEX "sales_visit_date_idx" ON "sales" USING btree ("visit_date");--> statement-breakpoint
CREATE INDEX "ticket_prices_product_day_idx" ON "ticket_prices" USING btree ("ticket_product_id","day_type","valid_from");--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_products_code_idx" ON "ticket_products" USING btree ("code");