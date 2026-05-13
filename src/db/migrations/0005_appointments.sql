-- ─── Appointment Types (tipologie sessione bookabili) ─────────
CREATE TABLE IF NOT EXISTS "appointment_types" (
    "id" serial PRIMARY KEY,
    "trainer_id" integer NOT NULL REFERENCES "trainers"("id"),
    "nome" text NOT NULL,
    "descrizione" text,
    "durata_minuti" integer NOT NULL,
    "colore_hex" text DEFAULT '#3b82f6' NOT NULL,
    "prezzo_centesimi" integer,
    "modalita" text DEFAULT 'in_presenza' NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "appointment_types_trainer_idx"
    ON "appointment_types" ("trainer_id");

-- ─── Availability Rules (orari ricorrenti settimanali) ─────────
CREATE TABLE IF NOT EXISTS "availability_rules" (
    "id" serial PRIMARY KEY,
    "trainer_id" integer NOT NULL REFERENCES "trainers"("id"),
    "giorno_settimana" integer NOT NULL,
    "start_time" text NOT NULL,
    "end_time" text NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL
);

CREATE INDEX IF NOT EXISTS "availability_rules_trainer_day_idx"
    ON "availability_rules" ("trainer_id", "giorno_settimana");

-- ─── Availability Overrides (eccezioni / ferie) ────────────────
CREATE TABLE IF NOT EXISTS "availability_overrides" (
    "id" serial PRIMARY KEY,
    "trainer_id" integer NOT NULL REFERENCES "trainers"("id"),
    "data" date NOT NULL,
    "tipo" text NOT NULL,
    "start_time" text,
    "end_time" text,
    "motivo" text,
    "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "availability_overrides_trainer_date_idx"
    ON "availability_overrides" ("trainer_id", "data");

-- ─── Appointments (prenotazioni) ───────────────────────────────
CREATE TABLE IF NOT EXISTS "appointments" (
    "id" serial PRIMARY KEY,
    "trainer_id" integer NOT NULL REFERENCES "trainers"("id"),
    "client_id" integer NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
    "appointment_type_id" integer REFERENCES "appointment_types"("id") ON DELETE SET NULL,
    "start_at" timestamp NOT NULL,
    "end_at" timestamp NOT NULL,
    "status" text DEFAULT 'pending' NOT NULL,
    "modalita" text DEFAULT 'in_presenza' NOT NULL,
    "cliente_note" text,
    "trainer_note" text,
    "cancelled_reason" text,
    "confirmed_at" timestamp,
    "cancelled_at" timestamp,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "appointments_trainer_start_idx"
    ON "appointments" ("trainer_id", "start_at");

CREATE INDEX IF NOT EXISTS "appointments_client_start_idx"
    ON "appointments" ("client_id", "start_at");

CREATE INDEX IF NOT EXISTS "appointments_status_idx"
    ON "appointments" ("status");
