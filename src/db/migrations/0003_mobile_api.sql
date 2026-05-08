-- Phase: mobile API (Bearer auth + refresh tokens + FCM devices)
-- Idempotente: può essere applicato anche se eseguito più volte.

CREATE TABLE IF NOT EXISTS "client_refresh_tokens" (
    "id" serial PRIMARY KEY NOT NULL,
    "client_id" integer NOT NULL,
    "token_hash" text NOT NULL,
    "device_id" text,
    "user_agent" text,
    "expires_at" timestamp NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "last_used_at" timestamp,
    "revoked_at" timestamp
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'client_refresh_tokens_client_id_clients_id_fk'
    ) THEN
        ALTER TABLE "client_refresh_tokens"
            ADD CONSTRAINT "client_refresh_tokens_client_id_clients_id_fk"
            FOREIGN KEY ("client_id") REFERENCES "clients"("id")
            ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "client_refresh_tokens_hash_idx"
    ON "client_refresh_tokens" ("token_hash");

CREATE INDEX IF NOT EXISTS "client_refresh_tokens_client_idx"
    ON "client_refresh_tokens" ("client_id");

CREATE TABLE IF NOT EXISTS "client_devices" (
    "id" serial PRIMARY KEY NOT NULL,
    "client_id" integer NOT NULL,
    "fcm_token" text NOT NULL,
    "platform" text NOT NULL,
    "device_id" text,
    "app_version" text,
    "last_seen_at" timestamp DEFAULT now() NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'client_devices_client_id_clients_id_fk'
    ) THEN
        ALTER TABLE "client_devices"
            ADD CONSTRAINT "client_devices_client_id_clients_id_fk"
            FOREIGN KEY ("client_id") REFERENCES "clients"("id")
            ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "client_devices_fcm_token_idx"
    ON "client_devices" ("fcm_token");

CREATE INDEX IF NOT EXISTS "client_devices_client_idx"
    ON "client_devices" ("client_id");
