-- ─── GDPR / Privacy consents ──────────────────────────────────
-- Aggiunge tracciamento dei consensi espliciti richiesti dal GDPR.
-- portal_terms_accepted_at è già presente; questi sono i consensi
-- specifici e separati richiesti dall'art. 7 GDPR.

ALTER TABLE "clients"
    ADD COLUMN IF NOT EXISTS "privacy_accepted_at" timestamp,
    ADD COLUMN IF NOT EXISTS "health_data_consent_at" timestamp,
    ADD COLUMN IF NOT EXISTS "marketing_consent_at" timestamp,
    ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;

-- Index per filtrare soft-deleted velocemente
CREATE INDEX IF NOT EXISTS "clients_deleted_at_idx"
    ON "clients" ("deleted_at");
