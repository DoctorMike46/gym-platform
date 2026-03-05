// src/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// connection string default for local development
const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgrespassword@localhost:5432/gym_platform';

// Disable prefetch as it is not supported for "Transaction" pool mode
const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });
