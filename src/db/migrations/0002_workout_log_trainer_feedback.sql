-- Phase: trainer feedback on workout log
ALTER TABLE "workout_logs" ADD COLUMN IF NOT EXISTS "trainer_note" text;
--> statement-breakpoint
ALTER TABLE "workout_logs" ADD COLUMN IF NOT EXISTS "trainer_note_updated_at" timestamp;
