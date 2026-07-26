import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("❌  DATABASE_URL is not set. Cannot run migrations.");
  process.exit(1);
}

// Single connection for migrations (no pool needed)
const migrationClient = postgres(databaseUrl, { max: 1 });
const db = drizzle(migrationClient);

console.log("⏳  Running database migrations...");

await migrate(db, {
  migrationsFolder: path.join(__dirname, "../drizzle"),
});

console.log("✅  Migrations complete.");
await migrationClient.end();
