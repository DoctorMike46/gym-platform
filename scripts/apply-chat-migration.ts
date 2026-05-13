import "dotenv/config";
import { Client } from "pg";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

async function main() {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL not set");
    }
    const sqlPath = resolve(process.cwd(), "src/db/migrations/0006_chat.sql");
    const sql = await readFile(sqlPath, "utf-8");
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
        console.log("Applying 0006_chat.sql…");
        await client.query(sql);
        console.log("✓ Migration applied (or already up-to-date)");
        const { rows } = await client.query<{ table_name: string }>(
            `SELECT table_name FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'chat_messages'`
        );
        console.log("Tables present:", rows.map((r) => r.table_name).join(", "));
    } finally {
        await client.end();
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
