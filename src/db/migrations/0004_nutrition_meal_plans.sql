-- ─── Meal Plans (piani alimentari) ─────────────────────────────
CREATE TABLE IF NOT EXISTS "meal_plans" (
    "id" serial PRIMARY KEY,
    "trainer_id" integer NOT NULL REFERENCES "trainers"("id"),
    "client_id" integer NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
    "nome" text NOT NULL,
    "attivo" boolean DEFAULT true NOT NULL,
    "data_inizio" date NOT NULL,
    "data_fine" date,
    "note" text,
    "kcal_target" integer,
    "proteine_g" integer,
    "carbo_g" integer,
    "grassi_g" integer,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "meal_plans_client_idx"
    ON "meal_plans" ("client_id");

CREATE INDEX IF NOT EXISTS "meal_plans_trainer_idx"
    ON "meal_plans" ("trainer_id");

-- ─── Meal Plan Meals (pasti per giorno) ─────────────────────────
-- giorno_settimana: 1=Lun … 7=Dom
-- momento: 'colazione' | 'spuntino_mat' | 'pranzo' | 'spuntino_pom' | 'cena' | 'pre_nanna'
CREATE TABLE IF NOT EXISTS "meal_plan_meals" (
    "id" serial PRIMARY KEY,
    "meal_plan_id" integer NOT NULL REFERENCES "meal_plans"("id") ON DELETE CASCADE,
    "giorno_settimana" integer NOT NULL,
    "momento" text NOT NULL,
    "ordine" integer DEFAULT 0 NOT NULL,
    "descrizione" text NOT NULL,
    "kcal" integer,
    "proteine_g" integer,
    "carbo_g" integer,
    "grassi_g" integer,
    "note" text
);

CREATE INDEX IF NOT EXISTS "meal_plan_meals_plan_day_idx"
    ON "meal_plan_meals" ("meal_plan_id", "giorno_settimana");
