import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

// DATABASE_URL from environment, defaulting to local Docker Postgres if not set
const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/apexium_dev";

// Use connection pool for app
const queryClient = postgres(databaseUrl, { max: 10 });

export const db = drizzle(queryClient, { schema });

export type Db = typeof db;
