-- ─── Workout exercise log attachments ─────────────────────────
-- Allegati (foto / video) associati alla riga di esecuzione di un
-- esercizio durante una sessione di allenamento.
--
-- kind: 'image' | 'video'
-- r2_key: chiave Cloudflare R2 (path strutturato per ownership-check)
--          formato: clients/<clientId>/workouts/<exerciseLogId>/<ts>_<filename>
-- size_bytes / duration_seconds: opzionali, riempiti dal client all'upload

CREATE TABLE IF NOT EXISTS "workout_exercise_log_attachments" (
    "id" serial PRIMARY KEY,
    "exercise_log_id" integer NOT NULL
        REFERENCES "workout_exercise_logs"("id") ON DELETE CASCADE,
    "client_id" integer NOT NULL
        REFERENCES "clients"("id") ON DELETE CASCADE,
    "trainer_id" integer NOT NULL REFERENCES "trainers"("id"),
    "r2_key" text NOT NULL,
    "mime_type" text NOT NULL,
    "kind" text NOT NULL,
    "filename" text,
    "size_bytes" integer,
    "duration_seconds" integer,
    "uploaded_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "workout_attachments_log_idx"
    ON "workout_exercise_log_attachments" ("exercise_log_id");

CREATE INDEX IF NOT EXISTS "workout_attachments_client_idx"
    ON "workout_exercise_log_attachments" ("client_id", "uploaded_at" DESC);
