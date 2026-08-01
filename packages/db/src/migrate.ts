import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrate() {
  const databaseUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.SUPABASE_DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/apexium_dev";

  console.log("⏳  Running database migrations...");

  const migrationsFolder = path.resolve(__dirname, "../drizzle");
  console.log("Using migrations folder:", migrationsFolder);

  const migrationClient = postgres(databaseUrl, { max: 1 });
  const db = drizzle(migrationClient);

  try {
    await migrate(db, { migrationsFolder });
    console.log("✅  Migrations complete.");
  } catch (error) {
    console.error("❌  Migration error:", error);
    process.exit(1);
  } finally {
    await migrationClient.end();
  }
}

runMigrate();
