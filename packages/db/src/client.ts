import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

// DATABASE_URL must be set in the environment before this module is imported.
// Format: postgresql://user:password@host:port/database
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL environment variable is not set. " +
      "Copy .env.example to .env and fill in the Supabase credentials."
  );
}

// Use a single connection for migrations/scripts; connection pool for the app.
// The `max` option controls pool size — 1 is safe for migrations.
const queryClient = postgres(databaseUrl, { max: 10 });

export const db = drizzle(queryClient, { schema });

export type Db = typeof db;
