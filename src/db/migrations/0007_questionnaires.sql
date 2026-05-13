-- ─── Questionnaire templates ──────────────────────────────────
CREATE TABLE IF NOT EXISTS "questionnaire_templates" (
    "id" serial PRIMARY KEY,
    "trainer_id" integer NOT NULL REFERENCES "trainers"("id"),
    "nome" text NOT NULL,
    "tipo" text DEFAULT 'generico' NOT NULL,
    "descrizione" text,
    "schema_json" jsonb NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- ─── Questionnaire assignments ────────────────────────────────
CREATE TABLE IF NOT EXISTS "questionnaire_assignments" (
    "id" serial PRIMARY KEY,
    "template_id" integer NOT NULL REFERENCES "questionnaire_templates"("id") ON DELETE CASCADE,
    "client_id" integer NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
    "trainer_id" integer NOT NULL REFERENCES "trainers"("id"),
    "status" text DEFAULT 'pending' NOT NULL,
    "motivo" text,
    "sent_at" timestamp DEFAULT now() NOT NULL,
    "completed_at" timestamp,
    "reminder_sent_at" timestamp,
    "subscription_id" integer REFERENCES "subscriptions"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "questionnaire_assignments_client_status_idx"
    ON "questionnaire_assignments" ("client_id", "status");

CREATE INDEX IF NOT EXISTS "questionnaire_assignments_trainer_status_idx"
    ON "questionnaire_assignments" ("trainer_id", "status");

-- ─── Questionnaire responses ──────────────────────────────────
CREATE TABLE IF NOT EXISTS "questionnaire_responses" (
    "id" serial PRIMARY KEY,
    "assignment_id" integer NOT NULL UNIQUE REFERENCES "questionnaire_assignments"("id") ON DELETE CASCADE,
    "response_json" jsonb NOT NULL,
    "submitted_at" timestamp DEFAULT now() NOT NULL
);
