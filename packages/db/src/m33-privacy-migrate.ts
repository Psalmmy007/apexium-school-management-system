/**
 * Milestone 33 — Data Privacy & NDPR Compliance DDL Migration
 *
 * Creates three privacy tables (idempotent — safe to run multiple times):
 *   1. privacy_consents         — consent / legal-basis tracking per data category
 *   2. data_retention_policies  — configurable retention periods per data category per school
 *   3. data_subject_requests    — right-to-access / right-to-deletion request workflow
 *
 * IDEMPOTENT: Safe to run multiple times. Uses IF NOT EXISTS throughout.
 */
import { db } from "./client";
import { sql } from "drizzle-orm";

async function runMigration() {
  console.log("🚀 Running Milestone 33 Data Privacy & NDPR Migration...");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS privacy_consents (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      data_subject_id UUID,
      subject_type    VARCHAR(50)  NOT NULL DEFAULT 'student',
      data_category   VARCHAR(100) NOT NULL,
      legal_basis     VARCHAR(100) NOT NULL DEFAULT 'consent',
      status          VARCHAR(50)  NOT NULL DEFAULT 'active',
      consent_text    TEXT,
      granted_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      expires_at      TIMESTAMPTZ,
      withdrawn_at    TIMESTAMPTZ,
      ip_address      VARCHAR(100),
      created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_privacy_consents_school ON privacy_consents(school_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_privacy_consents_subject ON privacy_consents(school_id, data_subject_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_privacy_consents_category ON privacy_consents(school_id, data_category)`);
  console.log("✅ privacy_consents table ready");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS data_retention_policies (
      id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id            UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      data_category        VARCHAR(100) NOT NULL,
      retention_years      INTEGER NOT NULL DEFAULT 7,
      auto_flag_expired    BOOLEAN NOT NULL DEFAULT TRUE,
      auto_delete_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
      legal_basis_note     TEXT,
      created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(school_id, data_category)
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_retention_school ON data_retention_policies(school_id)`);
  console.log("✅ data_retention_policies table ready");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS data_subject_requests (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      requester_email VARCHAR(255) NOT NULL,
      requester_name  VARCHAR(255),
      request_type    VARCHAR(50) NOT NULL DEFAULT 'access',
      data_categories TEXT[],
      subject_id      UUID,
      status          VARCHAR(50) NOT NULL DEFAULT 'pending',
      admin_notes     TEXT,
      reviewed_by     UUID REFERENCES users(id),
      reviewed_at     TIMESTAMPTZ,
      response_sent   BOOLEAN NOT NULL DEFAULT FALSE,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_dsr_school ON data_subject_requests(school_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_dsr_status ON data_subject_requests(school_id, status)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_dsr_email ON data_subject_requests(school_id, requester_email)`);
  console.log("✅ data_subject_requests table ready");

  console.log("✅ Milestone 33 Data Privacy & NDPR Migration complete.");
  process.exit(0);
}

runMigration().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
