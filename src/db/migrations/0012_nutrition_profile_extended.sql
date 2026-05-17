-- ─── Nutrition Profile esteso + Lifestyle + Medical History + Injuries + Requests ──
-- Migration idempotente: estende client_nutrition_profile e introduce 4 nuove tabelle
-- per supportare richieste piano alimentare strutturate da app mobile, profilo cliente
-- esteso e tracciamento infortuni.
--
-- GDPR art.9 — i campi `*_enc` contengono dati sanitari cifrati (vedi src/lib/crypto.ts).
-- Formato del valore enc: `v1:<base64-iv>:<base64-ciphertext+tag>`

-- ─── 1. Estensione client_nutrition_profile ─────────────────────────
ALTER TABLE "client_nutrition_profile"
    ADD COLUMN IF NOT EXISTS "intolleranze_json"             jsonb;
ALTER TABLE "client_nutrition_profile"
    ADD COLUMN IF NOT EXISTS "obiettivo_timeframe_settimane" integer;
ALTER TABLE "client_nutrition_profile"
    ADD COLUMN IF NOT EXISTS "peso_target_kg_enc"            text;
ALTER TABLE "client_nutrition_profile"
    ADD COLUMN IF NOT EXISTS "motivazione"                   text;

-- ─── 2. Client Lifestyle ────────────────────────────────────────────
-- 1-a-1 con clients. Abitudini auto-dichiarate (categoria ordinaria art.6 in chiaro).
-- consumo_acqua_litri ha shadow column cifrata per consistenza con pattern H4.
CREATE TABLE IF NOT EXISTS "client_lifestyle" (
    "id"                          serial PRIMARY KEY,
    "client_id"                   integer NOT NULL UNIQUE REFERENCES "clients"("id") ON DELETE CASCADE,
    "trainer_id"                  integer NOT NULL REFERENCES "trainers"("id"),
    "ore_sonno_medie"             integer,
    "livello_stress"              integer,            -- 1..10
    "n_pasti_die"                 integer,
    "orari_pasti"                 jsonb,              -- ["08:00","13:00",...]
    "occasioni_sociali_settimana" integer,
    "consumo_acqua_litri"         text,
    "consumo_acqua_litri_enc"     text,               -- GDPR shadow
    "fumo"                        text,               -- 'no' | 'si' | 'ex'
    "integratori"                 jsonb,              -- [{ nome, dosaggio }]
    "created_at"                  timestamp DEFAULT now() NOT NULL,
    "updated_at"                  timestamp DEFAULT now() NOT NULL
);

-- ─── 3. Client Medical History (GDPR art.9 — tutti i campi cifrati) ──
CREATE TABLE IF NOT EXISTS "client_medical_history" (
    "id"                     serial PRIMARY KEY,
    "client_id"              integer NOT NULL UNIQUE REFERENCES "clients"("id") ON DELETE CASCADE,
    "trainer_id"             integer NOT NULL REFERENCES "trainers"("id"),
    "patologie_enc"          text,
    "farmaci_enc"            text,
    "note_enc"               text,
    "disclaimer_accepted_at" timestamp,
    "created_at"             timestamp DEFAULT now() NOT NULL,
    "updated_at"             timestamp DEFAULT now() NOT NULL
);

-- ─── 4. Client Injuries (N per cliente) ─────────────────────────────
-- parte_corpo: enum esteso (spalla/gomito/polso sx/dx, schiena lombare/cervicale/dorsale,
--              anca/ginocchio/caviglia sx/dx, piede, mano, collo, altro)
-- tipo: 'muscolare' | 'articolare' | 'tendine' | 'osseo' | 'altro'
-- gravita: 'leggera' | 'media' | 'grave'
-- stato: 'attivo' | 'recuperato'
CREATE TABLE IF NOT EXISTS "client_injuries" (
    "id"            serial PRIMARY KEY,
    "client_id"     integer NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
    "trainer_id"    integer NOT NULL REFERENCES "trainers"("id"),
    "parte_corpo"   text NOT NULL,
    "tipo"          text,
    "gravita"       text NOT NULL,
    "stato"         text DEFAULT 'attivo' NOT NULL,
    "data_evento"   date,
    "data_recupero" date,
    "note_enc"      text,                              -- GDPR art.9
    "created_at"    timestamp DEFAULT now() NOT NULL,
    "updated_at"    timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "client_injuries_client_stato_idx"
    ON "client_injuries" ("client_id", "stato");

CREATE INDEX IF NOT EXISTS "client_injuries_trainer_stato_idx"
    ON "client_injuries" ("trainer_id", "stato");

-- ─── 5. Nutrition Requests (richieste piano alimentare) ─────────────
-- Snapshot wizard mobile. Workflow: pending → in_review → approved/declined.
-- Una volta approvata, linked_meal_plan_id punta al piano creato dal trainer.
CREATE TABLE IF NOT EXISTS "nutrition_requests" (
    "id"                       serial PRIMARY KEY,
    "client_id"                integer NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
    "trainer_id"               integer NOT NULL REFERENCES "trainers"("id"),
    "status"                   text DEFAULT 'pending' NOT NULL,

    -- Snapshot obiettivo
    "obiettivo"                text,
    "timeframe_settimane"      integer,
    "peso_target_kg_enc"       text,
    "motivazione"              text,

    -- Snapshot nutrizione
    "regime_alimentare"        text,
    "allergeni"                jsonb,
    "intolleranze"             jsonb,
    "cibi_preferiti"           jsonb,
    "cibi_evitati"             jsonb,
    "n_pasti_die"              integer,
    "orari_pasti"              jsonb,
    "occasioni_sociali"        integer,

    -- Snapshot lifestyle
    "ore_sonno"                integer,
    "livello_stress"           integer,
    "consumo_acqua_litri_enc"  text,
    "fumo"                     text,
    "integratori"              jsonb,

    -- Snapshot medico (art.9)
    "patologie_enc"            text,
    "farmaci_enc"              text,
    "note_libere_enc"          text,

    -- Workflow trainer
    "trainer_decline_reason"   text,
    "trainer_internal_note"    text,
    "linked_meal_plan_id"      integer REFERENCES "meal_plans"("id") ON DELETE SET NULL,
    "requested_at"             timestamp DEFAULT now() NOT NULL,
    "reviewed_at"              timestamp,
    "decided_at"               timestamp
);

CREATE INDEX IF NOT EXISTS "nutrition_requests_trainer_status_idx"
    ON "nutrition_requests" ("trainer_id", "status", "requested_at");

CREATE INDEX IF NOT EXISTS "nutrition_requests_client_status_idx"
    ON "nutrition_requests" ("client_id", "status");
