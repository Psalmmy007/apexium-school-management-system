import { db } from "./client";
import { sql } from "drizzle-orm";

async function runM20Migration() {
  console.log("🚀 Running Milestone 20 Communication & Notification Centre Database Migration...");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS comm_announcements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category VARCHAR(30) NOT NULL DEFAULT 'general',
      audience_type VARCHAR(30) NOT NULL DEFAULT 'all',
      target_id UUID,
      published_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Published',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_comm_ann_school_aud ON comm_announcements(school_id, audience_type, status);

    CREATE TABLE IF NOT EXISTS comm_notification_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      code VARCHAR(50) NOT NULL,
      channel VARCHAR(20) NOT NULL DEFAULT 'in_app',
      subject_template TEXT NOT NULL,
      body_template TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_comm_tpl_code_chan ON comm_notification_templates(school_id, code, channel);

    CREATE TABLE IF NOT EXISTS comm_notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      template_id UUID REFERENCES comm_notification_templates(id) ON DELETE SET NULL,
      recipient_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      recipient_role VARCHAR(30) NOT NULL DEFAULT 'parent',
      channel VARCHAR(20) NOT NULL DEFAULT 'in_app',
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      metadata JSONB DEFAULT '{}',
      status VARCHAR(20) NOT NULL DEFAULT 'Sent',
      error_message TEXT,
      sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_comm_notif_user_status ON comm_notifications(school_id, recipient_user_id, status);

    CREATE TABLE IF NOT EXISTS comm_domain_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      event_type VARCHAR(50) NOT NULL,
      entity_id UUID,
      payload JSONB NOT NULL DEFAULT '{}',
      processed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_comm_event_processed ON comm_domain_events(school_id, processed, created_at);

    CREATE TABLE IF NOT EXISTS comm_scheduled_triggers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      trigger_type VARCHAR(50) NOT NULL,
      schedule_cron VARCHAR(50) NOT NULL DEFAULT '0 8 * * *',
      next_run_at TIMESTAMPTZ NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_comm_trig_active ON comm_scheduled_triggers(school_id, active);

    CREATE TABLE IF NOT EXISTS comm_user_preferences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      sms_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_comm_pref_user ON comm_user_preferences(school_id, user_id);

    CREATE TABLE IF NOT EXISTS comm_audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      performed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(50) NOT NULL,
      details TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_comm_audit_school_date ON comm_audit_logs(school_id, created_at);
  `);

  console.log("✅ Milestone 20 Communication & Notification Centre Database Migration Completed Successfully!");
}

runM20Migration().catch((e) => {
  console.error("❌ Migration failed:", e);
  process.exit(1);
});
