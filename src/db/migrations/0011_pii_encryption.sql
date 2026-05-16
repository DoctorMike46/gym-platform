-- ─── Encryption at-rest PII (GDPR art.9 — H4) ─────────────────
-- Aggiunge colonne shadow `*_enc` per le PII sensibili. Le colonne
-- plain restano per il momento (dual-write/dual-read durante la
-- migrazione). Una volta che tutti i record sono backfillati e
-- l'app legge solo dalle colonne enc, una migrazione successiva
-- droppa le plain.
--
-- Formato del valore enc: `v1:<base64-iv>:<base64-ciphertext+tag>`
-- (vedi src/lib/crypto.ts)

-- body_measurements: 7 colonne misure
ALTER TABLE "body_measurements" ADD COLUMN IF NOT EXISTS "peso_kg_enc"      text;
ALTER TABLE "body_measurements" ADD COLUMN IF NOT EXISTS "body_fat_pct_enc" text;
ALTER TABLE "body_measurements" ADD COLUMN IF NOT EXISTS "vita_cm_enc"      text;
ALTER TABLE "body_measurements" ADD COLUMN IF NOT EXISTS "fianchi_cm_enc"   text;
ALTER TABLE "body_measurements" ADD COLUMN IF NOT EXISTS "petto_cm_enc"     text;
ALTER TABLE "body_measurements" ADD COLUMN IF NOT EXISTS "braccio_cm_enc"   text;
ALTER TABLE "body_measurements" ADD COLUMN IF NOT EXISTS "coscia_cm_enc"    text;

-- client_health_samples: solo `value` (gli altri campi non sono PII)
ALTER TABLE "client_health_samples" ADD COLUMN IF NOT EXISTS "value_enc" text;
