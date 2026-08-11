import { db } from "./client";
import { sql } from "drizzle-orm";

async function runM25Migration() {
  console.log("🚀 Running Milestone 25 Integrations & Automation Platform Migration...");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS integration_gateways (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      provider VARCHAR(50) NOT NULL,
      config JSONB DEFAULT '{}',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_gateway_school_provider ON integration_gateways(school_id, provider);

    CREATE TABLE IF NOT EXISTS integration_webhooks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      event VARCHAR(100) NOT NULL,
      target_url TEXT NOT NULL,
      secret_key VARCHAR(255) NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_webhook_school_event ON integration_webhooks(school_id, event);

    CREATE TABLE IF NOT EXISTS integration_webhook_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      webhook_id UUID REFERENCES integration_webhooks(id) ON DELETE CASCADE,
      event VARCHAR(100) NOT NULL,
      payload JSONB DEFAULT '{}',
      response_code INTEGER,
      status VARCHAR(50) NOT NULL DEFAULT 'success',
      attempt_count INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_webhook_log_school_status ON integration_webhook_logs(school_id, status);

    CREATE TABLE IF NOT EXISTS automation_cron_schedules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      task_type VARCHAR(100) NOT NULL,
      cron_expression VARCHAR(50) NOT NULL,
      last_run_at TIMESTAMPTZ,
      next_run_at TIMESTAMPTZ,
      status VARCHAR(50) NOT NULL DEFAULT 'Active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_automation_school_type ON automation_cron_schedules(school_id, task_type);
  `);

  console.log("✅ Milestone 25 Migration Completed Successfully!");
}

runM25Migration().catch((e) => {
  console.error("❌ Migration failed:", e);
  process.exit(1);
});
