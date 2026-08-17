import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index";

// DATABASE_URL from environment with fallbacks for Vercel / Supabase Postgres variables
const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.SUPABASE_DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/apexium_dev";

if (process.env.NODE_ENV === "production" && databaseUrl.includes("localhost")) {
  console.warn("WARNING: DATABASE_URL is pointing to localhost in production environment!");
}

// Cache connection across hot lambdas in serverless
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

// Configure serverless connection pooling
const queryClient =
  globalForDb.conn ??
  postgres(databaseUrl, {
    max: process.env.NODE_ENV === "production" ? 10 : 5,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false, // Critical for Supabase connection pooler / transaction mode
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.conn = queryClient;
}

export const db = drizzle(queryClient, { schema });

export type Db = typeof db;

