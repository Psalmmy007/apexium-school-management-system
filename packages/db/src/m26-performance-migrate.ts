import { db } from "./client";
import { sql } from "drizzle-orm";

async function runM26Migration() {
  console.log("🚀 Running Milestone 26 Performance & Scalability Migration...");

  await db.execute(sql`
    -- 1. Composite Index on Students for fast class/status filtering
    CREATE INDEX IF NOT EXISTS idx_students_school_class_status 
    ON students(school_id, class_id, status);

    -- 2. Composite Index on Attendance Records for daily class attendance reporting
    CREATE INDEX IF NOT EXISTS idx_attendance_school_class_date 
    ON attendance_records(school_id, class_id, date);

    -- 3. Composite Index on Student Scores for term result aggregation
    CREATE INDEX IF NOT EXISTS idx_scores_school_student_term 
    ON student_scores(school_id, student_id, term_id);

    -- 4. Composite Index on Fee Invoices for ledger analytics
    CREATE INDEX IF NOT EXISTS idx_invoices_school_status_due 
    ON fee_invoices(school_id, status, created_at);
  `);

  console.log("✅ Milestone 26 Migration Completed Successfully!");
}

runM26Migration().catch((e) => {
  console.error("❌ Migration failed:", e);
  process.exit(1);
});
