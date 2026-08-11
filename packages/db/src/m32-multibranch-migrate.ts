/**
 * Milestone 32 — Multi-Branch / School Group Support Migration
 *
 * Creates tables for:
 *   - school_groups
 *   - group_memberships
 * Adds columns to schools table:
 *   - group_id
 *   - branch_name
 *   - is_group_headquarters
 *
 * IDEMPOTENT: Safe to run multiple times. Uses IF NOT EXISTS throughout.
 */
import { db } from "./client";
import { sql } from "drizzle-orm";

async function runMigration() {
  console.log("🚀 Running Milestone 32 Multi-Branch Migration...");

  // ── school_groups ────────────────────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS school_groups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(100) NOT NULL UNIQUE,
      owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      subscription_id UUID REFERENCES saas_school_subscriptions(id) ON DELETE SET NULL,
      max_branches_limit INTEGER NOT NULL DEFAULT 5,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_group_slug ON school_groups(slug);
  `);

  // ── group_memberships ────────────────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS group_memberships (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id UUID NOT NULL REFERENCES school_groups(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(50) NOT NULL DEFAULT 'group_admin',
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_group_member_user ON group_memberships(group_id, user_id);
  `);

  // ── Add columns to schools table ──────────────────────────────────────────────
  await db.execute(sql`
    ALTER TABLE schools
    ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES school_groups(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS branch_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS is_group_headquarters BOOLEAN NOT NULL DEFAULT FALSE;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_school_group ON schools(group_id);
  `);

  console.log("✅ Milestone 32 Multi-Branch Migration complete.");
}

runMigration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  });
