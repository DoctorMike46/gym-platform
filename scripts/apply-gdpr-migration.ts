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
        "src/db/migrations/0008_gdpr_consents.sql"
    );
    const sql = await readFile(sqlPath, "utf-8");
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
        console.log("Applying 0008_gdpr_consents.sql…");
        await client.query(sql);
        console.log("✓ Migration applied (or already up-to-date)");
        const { rows } = await client.query<{ column_name: string }>(
            `SELECT column_name FROM information_schema.columns
             WHERE table_schema = 'public'
               AND table_name = 'clients'
               AND column_name IN (
                   'privacy_accepted_at',
                   'health_data_consent_at',
                   'marketing_consent_at',
                   'deleted_at'
               )
             ORDER BY column_name`
        );
        console.log(
            "Columns present:",
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
