-- ─── Audit Logs (GDPR art.9) ──────────────────────────────────
-- Tracciamento accessi a dati sanitari e biometrici dei clienti.
-- Pensata per rispondere a istanze art.15 GDPR ("chi ha visto i miei dati?")
-- e per investigation in caso di breach.
--
-- actor_type: 'trainer' | 'client' | 'system'
-- actor_id : nullable (null per azioni di sistema, es. cron, cleanup)
-- action   : namespaced, es. 'health.read', 'health.write', 'measurement.read',
--            'photo.read', 'gdpr.export', 'gdpr.delete'
-- client_id: valorizzato quando l'azione riguarda dati di un cliente specifico
-- metadata : jsonb arbitrario (es. count campioni, range temporale, type filter)

CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" serial PRIMARY KEY,
    "actor_type" text NOT NULL,
    "actor_id" integer,
    "action" text NOT NULL,
    "resource_type" text NOT NULL,
    "resource_id" integer,
    "client_id" integer,
    "metadata" jsonb,
    "ip_address" text,
    "user_agent" text,
    "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "audit_logs_actor_idx"
    ON "audit_logs" ("actor_type", "actor_id", "created_at");

CREATE INDEX IF NOT EXISTS "audit_logs_client_idx"
    ON "audit_logs" ("client_id", "created_at");

CREATE INDEX IF NOT EXISTS "audit_logs_action_idx"
    ON "audit_logs" ("action", "created_at");
