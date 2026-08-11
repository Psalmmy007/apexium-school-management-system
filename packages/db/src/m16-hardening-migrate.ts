/**
 * Milestone 16.1 Direct Migration Script — Database Hardening
 *
 * Adds:
 *   1. admission_sequences table & unique index (school_id, academic_year)
 *   2. Extended columns for students (merged_into_id, merged_at, merged_by, is_read_only)
 *   3. Extended columns for student_documents (is_deleted, deleted_at, deleted_by, delete_reason, file_hash)
 *   4. Indexes for query scaling & tenant isolation
 */
import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { max: 1 });

async function main() {
  console.log("Connecting to Supabase for Milestone 16.1 migration...");

  // 1. Create admission_sequences table
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS admission_sequences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      academic_year VARCHAR(10) NOT NULL,
      current_number INT NOT NULL DEFAULT 0,
      format_template VARCHAR(100) NOT NULL DEFAULT '{prefix}/{year}/{seq:6}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  console.log("✓ Created admission_sequences table");

  await sql.unsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS school_academic_year_idx 
    ON admission_sequences(school_id, academic_year)
  `);
  console.log("✓ Created school_academic_year_idx index");

  // 2. Extend students table
  await sql.unsafe(`
    ALTER TABLE students 
    ADD COLUMN IF NOT EXISTS merged_into_id UUID REFERENCES students(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS merged_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS merged_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS is_read_only BOOLEAN NOT NULL DEFAULT FALSE
  `);
  console.log("✓ Extended students table with merge & read-only fields");

  // 3. Extend student_documents table
  await sql.unsafe(`
    ALTER TABLE student_documents 
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS delete_reason TEXT,
    ADD COLUMN IF NOT EXISTS file_hash VARCHAR(64)
  `);
  console.log("✓ Extended student_documents table with soft delete & hash fields");

  // 4. Create performance indexes
  await sql.unsafe(`
    CREATE INDEX IF NOT EXISTS idx_students_status_class_section 
    ON students(school_id, status, class_id, section_id)
  `);
  await sql.unsafe(`
    CREATE INDEX IF NOT EXISTS idx_students_name_dob 
    ON students(school_id, first_name, last_name, date_of_birth)
  `);
  await sql.unsafe(`
    CREATE INDEX IF NOT EXISTS idx_student_docs_active 
    ON student_documents(school_id, student_id, is_deleted)
  `);
  console.log("✓ Created production performance indexes");

  await sql.end();
  console.log("Milestone 16.1 Migration Complete!");
}

main().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
