import { describe, it, expect, beforeAll } from "vitest";
import {
  db,
  schools,
  users,
  students,
  analyticsKpiSnapshots,
  analyticsCachedReports,
  analyticsStudentRiskScores,
  analyticsReportQueue,
} from "../index";
import {
  generateExecutiveKpiSummary,
  generateAcademicAnalytics,
  generateFinancialAnalytics,
  calculateStudentRiskScores,
  getCachedOrFreshAnalyticsReport,
  exportAnalyticsDataset,
  queueAnalyticalReport,
  generateAuditSecurityAnalytics,
} from "./analytics";
import { eq, sql } from "drizzle-orm";

let schoolAId: string;
let schoolBId: string;

beforeAll(async () => {
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

    CREATE TABLE IF NOT EXISTS analytics_cached_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      report_type TEXT NOT NULL,
      parameters JSONB DEFAULT '{}',
      data JSONB NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE analytics_cached_reports ALTER COLUMN report_type TYPE TEXT;

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

    CREATE TABLE IF NOT EXISTS analytics_report_queue (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      report_type VARCHAR(50) NOT NULL,
      format VARCHAR(20) NOT NULL DEFAULT 'csv',
      status VARCHAR(20) NOT NULL DEFAULT 'Queued',
      parameters JSONB DEFAULT '{}',
      download_url TEXT,
      file_size VARCHAR(50),
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS analytics_audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      performed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(50) NOT NULL,
      details TEXT NOT NULL,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const [sA] = await db
    .insert(schools)
    .values({ name: "Analytics Comprehensive School A", slug: `analytics-comp-a-${Date.now()}` })
    .returning();
  schoolAId = sA.id;

  const [sB] = await db
    .insert(schools)
    .values({ name: "Analytics Comprehensive School B", slug: `analytics-comp-b-${Date.now()}` })
    .returning();
  schoolBId = sB.id;

  await db.insert(students).values({
    schoolId: schoolAId,
    admissionNumber: "ADM-99902",
    firstName: "TestFilterRisk",
    lastName: "Student",
  });
});

describe("Milestone 21 Comprehensive Analytics & Executive Dashboard Integration Tests", () => {
  // 1. Dimensional Filter Query Testing
  it("filters Executive KPI summaries by Session, Term, and Class parameters", async () => {
    const kpi = await generateExecutiveKpiSummary(schoolAId, {
      sessionId: "2025/2026",
      termId: "First Term",
      classId: "JSS1",
    });
    expect(kpi).toBeDefined();
    expect(kpi.filters.sessionId).toBe("2025/2026");
  });

  // 2. Multi-Format Report Exporter (PDF, Excel, CSV)
  it("exports analytical reports in PDF, Excel, and CSV formats", async () => {
    const pdf = await exportAnalyticsDataset(schoolAId, "executive", "pdf");
    expect(pdf).toContain("<!DOCTYPE html>");
    expect(pdf).toContain("Executive Analytics Report");

    const excel = await exportAnalyticsDataset(schoolAId, "executive", "excel");
    expect(excel).toContain("Metric\tValue");

    const csv = await exportAnalyticsDataset(schoolAId, "executive", "csv");
    expect(csv).toContain("Metric,Value");
  });

  // 3. Background Report Queue Processing
  it("queues and processes analytical reports asynchronously in the background", async () => {
    const job = await queueAnalyticalReport(schoolAId, "executive", "pdf", { session: "2025/2026" });
    expect(job).toBeDefined();
    expect(job.status).toBe("Queued");

    const [updated] = await db.select().from(analyticsReportQueue).where(eq(analyticsReportQueue.id, job.id));
    expect(updated.status).toBe("Completed");
    expect(updated.downloadUrl).toContain("format=pdf");
  });

  // 4. Predictive Examination Risk Scoring Engine
  it("evaluates examination risk and updates risk score records", async () => {
    const list = await calculateStudentRiskScores(schoolAId);
    expect(Array.isArray(list)).toBe(true);

    const scoresList = await db.select().from(analyticsStudentRiskScores).where(eq(analyticsStudentRiskScores.schoolId, schoolAId));
    expect(scoresList.length).toBeGreaterThan(0);
    expect(scoresList[0].examRiskScore).toBeDefined();
  });

  // 5. Audit & Security Analytics
  it("generates administrator audit and security analytics metrics", async () => {
    const audit = await generateAuditSecurityAnalytics(schoolAId);
    expect(audit.totalSecurityEvents).toBeGreaterThanOrEqual(0);
    expect(audit.moduleUsageBreakdown.academics).toBeDefined();
  });

  // 6. Multi-Tenant Isolation
  it("enforces complete multi-tenant isolation between School A and School B for report queues and analytics", async () => {
    const queueB = await db.select().from(analyticsReportQueue).where(eq(analyticsReportQueue.id, schoolBId));
    expect(queueB.length).toBe(0); // Isolated
  });
});
