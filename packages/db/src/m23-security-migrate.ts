import { db } from "./client";
import { sql } from "drizzle-orm";

async function runM23Migration() {
  console.log("🚀 Running Milestone 23 Security, Authentication & Permission Hardening Migration...");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS security_login_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      email VARCHAR(255) NOT NULL,
      ip_address VARCHAR(50),
      user_agent TEXT,
      status VARCHAR(50) NOT NULL,
      failure_reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_sec_login_school_user ON security_login_history(school_id, email, created_at);

    CREATE TABLE IF NOT EXISTS security_active_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(255) NOT NULL,
      device_info TEXT,
      ip_address VARCHAR(50),
      expires_at TIMESTAMPTZ NOT NULL,
      last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_sec_active_session_user ON security_active_sessions(user_id, is_revoked);

    CREATE TABLE IF NOT EXISTS security_rate_limits (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
      identifier VARCHAR(100) NOT NULL,
      hits_count INTEGER NOT NULL DEFAULT 1,
      window_starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      blocked_until TIMESTAMPTZ
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_sec_rate_identifier ON security_rate_limits(identifier);

    CREATE TABLE IF NOT EXISTS security_audit_trails (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      performed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(50) NOT NULL,
      details TEXT NOT NULL,
      ip_address VARCHAR(50),
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_sec_audit_school_date ON security_audit_trails(school_id, created_at);
  `);

  console.log("✅ Milestone 23 Security Migration Completed Successfully!");
}

runM23Migration().catch((e) => {
  console.error("❌ Migration failed:", e);
  process.exit(1);
});
