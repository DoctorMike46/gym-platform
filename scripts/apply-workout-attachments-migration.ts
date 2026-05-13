import "dotenv/config";
import { Client } from "pg";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

async function main() {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL not set");
    }
    const sqlPath = resolve(
        process.cwd(),
        "src/db/migrations/0009_workout_attachments.sql"
    );
    const sql = await readFile(sqlPath, "utf-8");
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
        console.log("Applying 0009_workout_attachments.sql…");
        await client.query(sql);
        console.log("✓ Migration applied (or already up-to-date)");
        const { rows } = await client.query<{ column_name: string }>(
            `SELECT column_name FROM information_schema.columns
             WHERE table_schema = 'public'
               AND table_name = 'workout_exercise_log_attachments'
             ORDER BY ordinal_position`
        );
        console.log(
            "Columns:",
            rows.map((r) => r.column_name).join(", ")
        );
    } finally {
        await client.end();
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
