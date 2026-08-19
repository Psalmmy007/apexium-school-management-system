/**
 * Milestone 42 Migration Script — Admissions Pipeline Extension
 *
 * Adds:
 * 1. Extended columns on admission_applications for:
 *    - acceptance_fee_required, acceptance_fee_verified, acceptance_fee_reference, acceptance_fee_amount
 *    - application_fee_amount
 *    - interview_date, interview_location, interview_notes, interview_score
 *    - entrance_exam_score, cbt_exam_id
 * 2. Extended columns on cbt_exam_sessions:
 *    - admission_application_id (nullable, references admission_applications)
 *    - applicant_reference (nullable)
 *    - Alter student_id to be nullable so entrance exams can be taken by prospective applicants
 */

import postgres from "postgres";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres.gadpsebirkwblhguxrjw:Mediocrity00%40%40%23%23@aws-1-eu-west-2.pooler.supabase.com:6543/postgres";

const sql = postgres(DATABASE_URL, { max: 1 });

async function main() {
  console.log("Connecting to database for Milestone 42 migration...");

  // 1. Extend admission_applications table
  await sql.unsafe(`
    ALTER TABLE admission_applications
    ADD COLUMN IF NOT EXISTS acceptance_fee_required BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS acceptance_fee_verified BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS acceptance_fee_reference VARCHAR(200),
    ADD COLUMN IF NOT EXISTS acceptance_fee_amount INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS application_fee_amount INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS interview_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS interview_location VARCHAR(255),
    ADD COLUMN IF NOT EXISTS interview_notes TEXT,
    ADD COLUMN IF NOT EXISTS interview_score INT,
    ADD COLUMN IF NOT EXISTS entrance_exam_score INT,
    ADD COLUMN IF NOT EXISTS cbt_exam_id UUID REFERENCES cbt_exams(id) ON DELETE SET NULL;
  `);
  console.log("✓ Extended admission_applications table");

  // 2. Extend cbt_exam_sessions table to allow applicant entrance exams
  await sql.unsafe(`
    ALTER TABLE cbt_exam_sessions
    ALTER COLUMN student_id DROP NOT NULL;

    ALTER TABLE cbt_exam_sessions
    ADD COLUMN IF NOT EXISTS admission_application_id UUID REFERENCES admission_applications(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS applicant_reference VARCHAR(100);
  `);
  console.log("✓ Extended cbt_exam_sessions table for applicant entrance CBT");

  // 3. Create index for fast applicant exam lookup
  await sql.unsafe(`
    CREATE INDEX IF NOT EXISTS idx_cbt_session_applicant
    ON cbt_exam_sessions(school_id, admission_application_id);
  `);
  console.log("✓ Created index idx_cbt_session_applicant");

  await sql.end();
  console.log("✓ Milestone 42 migration completed successfully!");
}

main().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
