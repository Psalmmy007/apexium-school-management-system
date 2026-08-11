/**
 * Milestone 31 — Data Portability & Self-Service Export Migration
 *
 * Creates data_exports table and indexes.
 *
 * IDEMPOTENT: Uses IF NOT EXISTS throughout. Safe to run multiple times.
 */
import { db } from "./client";
import { sql } from "drizzle-orm";

async function runMigration() {
  console.log("🚀 Running Milestone 31 Data Export Migration...");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS data_exports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
      format VARCHAR(20) NOT NULL DEFAULT 'csv',
      status VARCHAR(30) NOT NULL DEFAULT 'QUEUED',
      progress INTEGER NOT NULL DEFAULT 0,
      file_reference TEXT,
      file_size INTEGER NOT NULL DEFAULT 0,
      record_count INTEGER NOT NULL DEFAULT 0,
      datasets JSONB,
      error_message TEXT,
      expires_at TIMESTAMPTZ,
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_export_school ON data_exports(school_id);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_export_school_status ON data_exports(school_id, status);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_export_school_created ON data_exports(school_id, created_at);
  `);

  console.log("✅ Milestone 31 Data Export Migration complete.");
}

runMigration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  });
