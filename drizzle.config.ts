import { defineConfig } from "drizzle-kit";

export default defineConfig({
    schema: "./src/db/schema.ts",
    out: "./src/db/migrations",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.DATABASE_URL || "postgres://michelespinelli:Michele46@localhost:5432/gym_platform",
    },
    verbose: true,
    strict: true,
});
