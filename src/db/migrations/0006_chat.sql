-- ─── Chat messages (trainer ↔ cliente) ─────────────────
CREATE TABLE IF NOT EXISTS "chat_messages" (
    "id" serial PRIMARY KEY,
    "trainer_id" integer NOT NULL REFERENCES "trainers"("id"),
    "client_id" integer NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
    "sender_role" text NOT NULL,
    "body" text NOT NULL,
    "attachment_r2_key" text,
    "attachment_mime_type" text,
    "read_at" timestamp,
    "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "chat_messages_conversation_idx"
    ON "chat_messages" ("trainer_id", "client_id", "created_at");

CREATE INDEX IF NOT EXISTS "chat_messages_unread_idx"
    ON "chat_messages" ("client_id", "read_at", "sender_role");
