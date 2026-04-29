-- Phase 1: trainer password_changed_at
ALTER TABLE "trainers" ADD COLUMN IF NOT EXISTS "password_changed_at" timestamp;
--> statement-breakpoint

-- Phase 8: settings notification flag
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "notifications_workout_logs" boolean DEFAULT false NOT NULL;
--> statement-breakpoint

-- Phase 5: clients portal columns
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "telefono" text;
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "password_hash" text;
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "password_set_at" timestamp;
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "password_changed_at" timestamp;
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "last_login_at" timestamp;
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "invite_token" text;
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "invite_token_expires_at" timestamp;
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "portal_terms_accepted_at" timestamp;
--> statement-breakpoint

-- Indexes (note: trainer/email unique index requires no duplicates pre-existing)
CREATE UNIQUE INDEX IF NOT EXISTS "clients_trainer_email_idx" ON "clients" ("trainer_id", "email");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clients_invite_token_idx" ON "clients" ("invite_token");
--> statement-breakpoint

-- body_measurements
CREATE TABLE IF NOT EXISTS "body_measurements" (
  "id" serial PRIMARY KEY NOT NULL,
  "client_id" integer NOT NULL,
  "date" date NOT NULL,
  "peso_kg" text,
  "body_fat_pct" text,
  "vita_cm" text,
  "fianchi_cm" text,
  "petto_cm" text,
  "braccio_cm" text,
  "coscia_cm" text,
  "note" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "body_measurements" ADD CONSTRAINT "body_measurements_client_id_clients_id_fk"
  FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- progress_photos
CREATE TABLE IF NOT EXISTS "progress_photos" (
  "id" serial PRIMARY KEY NOT NULL,
  "client_id" integer NOT NULL,
  "date" date NOT NULL,
  "r2_key" text NOT NULL,
  "type" text NOT NULL,
  "note" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "progress_photos" ADD CONSTRAINT "progress_photos_client_id_clients_id_fk"
  FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- workout_logs
CREATE TABLE IF NOT EXISTS "workout_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "client_id" integer NOT NULL,
  "assignment_id" integer,
  "template_id" integer,
  "giorno" integer,
  "date_executed" date NOT NULL,
  "status" text DEFAULT 'in_progress' NOT NULL,
  "total_duration_seconds" integer,
  "note" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workout_logs" ADD CONSTRAINT "workout_logs_client_id_clients_id_fk"
  FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workout_logs" ADD CONSTRAINT "workout_logs_assignment_id_client_workout_assignments_id_fk"
  FOREIGN KEY ("assignment_id") REFERENCES "public"."client_workout_assignments"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workout_logs" ADD CONSTRAINT "workout_logs_template_id_workout_templates_id_fk"
  FOREIGN KEY ("template_id") REFERENCES "public"."workout_templates"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

-- workout_exercise_logs
CREATE TABLE IF NOT EXISTS "workout_exercise_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "workout_log_id" integer NOT NULL,
  "template_exercise_id" integer,
  "ordine" integer DEFAULT 0 NOT NULL,
  "sets_completed" integer DEFAULT 0 NOT NULL,
  "reps_actual" jsonb,
  "weight_actual" jsonb,
  "rpe_actual" jsonb,
  "note" text
);
--> statement-breakpoint
ALTER TABLE "workout_exercise_logs" ADD CONSTRAINT "workout_exercise_logs_workout_log_id_workout_logs_id_fk"
  FOREIGN KEY ("workout_log_id") REFERENCES "public"."workout_logs"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workout_exercise_logs" ADD CONSTRAINT "workout_exercise_logs_template_exercise_id_workout_template_exercises_id_fk"
  FOREIGN KEY ("template_exercise_id") REFERENCES "public"."workout_template_exercises"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

-- client_password_reset_tokens
CREATE TABLE IF NOT EXISTS "client_password_reset_tokens" (
  "id" serial PRIMARY KEY NOT NULL,
  "client_id" integer NOT NULL,
  "token" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "client_password_reset_tokens_token_unique" UNIQUE ("token")
);
--> statement-breakpoint
ALTER TABLE "client_password_reset_tokens" ADD CONSTRAINT "client_password_reset_tokens_client_id_clients_id_fk"
  FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
