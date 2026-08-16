ALTER TABLE "config_items" ADD COLUMN "phase" text;
--> statement-breakpoint
-- Nonaktifkan tugas harian placeholder lama (tanpa tahap) pada install lama;
-- tugas baru + tahap disuplai oleh seed idempotent.
UPDATE "config_items" SET "active" = false
WHERE "section" = 'hours' AND "phase" IS NULL;
