CREATE TABLE "client_workout_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"template_id" integer NOT NULL,
	"data_assegnazione" date DEFAULT now() NOT NULL,
	"note" text,
	"attivo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"cognome" text NOT NULL,
	"email" text NOT NULL,
	"peso" text,
	"altezza" text,
	"eta" integer,
	"data_di_nascita" date,
	"anamnesi_status" text DEFAULT 'non firmato' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "clients_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"tipo_documento" text NOT NULL,
	"firma_digitale_data" timestamp,
	"pdf_url" text
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"gruppo_muscolare" text,
	"video_url" text,
	"descrizione" text,
	"istruzioni_step_by_step" jsonb
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome_servizio" text NOT NULL,
	"prezzo" integer NOT NULL,
	"descrizione_breve" text,
	"durata_settimane" integer,
	"include_coaching" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"trainer_id" text NOT NULL,
	"site_name" text DEFAULT 'Ernesto Performance' NOT NULL,
	"logo_url" text,
	"sidebar_logo_url" text,
	"primary_color" text DEFAULT '#003366' NOT NULL,
	"sidebar_color" text DEFAULT '#003366' NOT NULL,
	"secondary_color" text
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"service_id" integer NOT NULL,
	"data_inizio" date NOT NULL,
	"data_fine" date,
	"status" text DEFAULT 'attivo' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trainers" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"nome" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "trainers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workout_template_exercises" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"exercise_id" integer NOT NULL,
	"giorno" integer DEFAULT 1 NOT NULL,
	"ordine" integer DEFAULT 0 NOT NULL,
	"serie" text,
	"ripetizioni" text,
	"recupero" text,
	"rpe" text,
	"note_tecniche" text
);
--> statement-breakpoint
CREATE TABLE "workout_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome_template" text NOT NULL,
	"split_settimanale" integer,
	"note_progressione" text DEFAULT 'Aumento ripetizioni: +1-2 rip finché arrivi al top range, poi aumenta il carico',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "client_workout_assignments" ADD CONSTRAINT "client_workout_assignments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_workout_assignments" ADD CONSTRAINT "client_workout_assignments_template_id_workout_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."workout_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_template_exercises" ADD CONSTRAINT "workout_template_exercises_template_id_workout_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."workout_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_template_exercises" ADD CONSTRAINT "workout_template_exercises_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;