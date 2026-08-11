import { db } from "./client";
import { sql } from "drizzle-orm";

async function runM21Migration() {
  console.log("🚀 Running Milestone 21 Analytics & Executive Dashboard Database Migration...");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS analytics_kpi_snapshots (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      snapshot_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      total_students INTEGER NOT NULL DEFAULT 0,
      total_teachers INTEGER NOT NULL DEFAULT 0,
      total_staff INTEGER NOT NULL DEFAULT 0,
      student_attendance_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
      staff_attendance_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
      total_revenue DOUBLE PRECISION NOT NULL DEFAULT 0,
      total_expenses DOUBLE PRECISION NOT NULL DEFAULT 0,
      net_income DOUBLE PRECISION NOT NULL DEFAULT 0,
      outstanding_fees DOUBLE PRECISION NOT NULL DEFAULT 0,
      hostel_occupancy_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
      transport_utilization_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
      library_active_loans INTEGER NOT NULL DEFAULT 0,
      cbt_exams_completed INTEGER NOT NULL DEFAULT 0,
      lms_submissions_count INTEGER NOT NULL DEFAULT 0,
      at_risk_students_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_analytics_kpi_school_date ON analytics_kpi_snapshots(school_id, snapshot_date);

    CREATE TABLE IF NOT EXISTS analytics_cached_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      report_type VARCHAR(50) NOT NULL,
      parameters JSONB DEFAULT '{}',
      data JSONB NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_analytics_cache_school_type ON analytics_cached_reports(school_id, report_type, expires_at);

    CREATE TABLE IF NOT EXISTS analytics_student_risk_scores (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      academic_risk_score DOUBLE PRECISION NOT NULL DEFAULT 0,
      attendance_risk_score DOUBLE PRECISION NOT NULL DEFAULT 0,
      fee_default_risk_score DOUBLE PRECISION NOT NULL DEFAULT 0,
      exam_risk_score DOUBLE PRECISION NOT NULL DEFAULT 0,
      overall_risk_category VARCHAR(20) NOT NULL DEFAULT 'Low',
      flagged_reasons JSONB DEFAULT '[]',
      calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_analytics_risk_school_cat ON analytics_student_risk_scores(school_id, overall_risk_category);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_risk_student ON analytics_student_risk_scores(school_id, student_id);

    CREATE TABLE IF NOT EXISTS analytics_audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      performed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(50) NOT NULL,
      details TEXT NOT NULL,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_analytics_audit_school_date ON analytics_audit_logs(school_id, created_at);
  `);

  console.log("✅ Milestone 21 Analytics & Executive Dashboard Database Migration Completed Successfully!");
}

runM21Migration().catch((e) => {
  console.error("❌ Migration failed:", e);
  process.exit(1);
});
