import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// connection string from environment variable
const connectionString = process.env.DATABASE_URL!;

// Use a global variable to reuse the postgres client across hot reloads in development
// This prevents "too many clients already" errors from Postgres
const globalForDb = global as unknown as {
    conn: postgres.Sql | undefined;
};

const queryClient = globalForDb.conn ?? postgres(connectionString, { prepare: false });

if (process.env.NODE_ENV !== 'production') {
    globalForDb.conn = queryClient;
}

export const db = drizzle(queryClient, { schema });
