import "dotenv/config";
import { Client } from "pg";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

/**
 * Applica la migration 0004_nutrition_meal_plans.sql in modo idempotente,
 * bypassando il sistema drizzle migration come per le altre migration manuali.
 */
async function main() {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL not set");
    }

    const sqlPath = resolve(
        process.cwd(),
        "src/db/migrations/0004_nutrition_meal_plans.sql"
    );
    const sql = await readFile(sqlPath, "utf-8");

    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
        console.log("Applying 0004_nutrition_meal_plans.sql…");
        await client.query(sql);
        console.log("✓ Migration applied (or already up-to-date)");

        const { rows } = await client.query<{ table_name: string }>(
            `SELECT table_name FROM information_schema.tables
             WHERE table_schema = 'public'
               AND table_name IN ('meal_plans', 'meal_plan_meals')
             ORDER BY table_name`
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
