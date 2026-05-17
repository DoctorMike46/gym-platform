import "dotenv/config";
import { Client } from "pg";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

/**
 * Applica la migration 0012_nutrition_profile_extended.sql in modo idempotente,
 * bypassando il sistema drizzle migration come per le altre migration manuali.
 *
 * Aggiunge:
 *  - Estensione client_nutrition_profile (peso_target_kg_enc, obiettivo_timeframe_settimane,
 *    motivazione, intolleranze_json)
 *  - client_lifestyle
 *  - client_medical_history (GDPR art.9)
 *  - client_injuries
 *  - nutrition_requests
 */
async function main() {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL not set");
    }

    const sqlPath = resolve(
        process.cwd(),
        "src/db/migrations/0012_nutrition_profile_extended.sql"
    );
    const sql = await readFile(sqlPath, "utf-8");

    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
        console.log("Applying 0012_nutrition_profile_extended.sql…");
        await client.query(sql);
        console.log("✓ Migration applied (or already up-to-date)");

        const { rows: tables } = await client.query<{ table_name: string }>(
            `SELECT table_name FROM information_schema.tables
             WHERE table_schema = 'public'
               AND table_name IN (
                 'client_lifestyle',
                 'client_medical_history',
                 'client_injuries',
                 'nutrition_requests'
               )
             ORDER BY table_name`
        );
        console.log("New tables present:", tables.map((r) => r.table_name).join(", "));

        const { rows: cols } = await client.query<{ column_name: string }>(
            `SELECT column_name FROM information_schema.columns
             WHERE table_schema = 'public'
               AND table_name = 'client_nutrition_profile'
               AND column_name IN (
                 'intolleranze_json',
                 'obiettivo_timeframe_settimane',
                 'peso_target_kg_enc',
                 'motivazione'
               )
             ORDER BY column_name`
        );
        console.log("New columns in client_nutrition_profile:", cols.map((r) => r.column_name).join(", "));
    } finally {
        await client.end();
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
