import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";

async function main() {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL not set");
    }
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    const db = drizzle(client);
    console.log("Running migrations…");
    await migrate(db, { migrationsFolder: "./src/db/migrations" });
    console.log("✓ Migrations applied");
    await client.end();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
