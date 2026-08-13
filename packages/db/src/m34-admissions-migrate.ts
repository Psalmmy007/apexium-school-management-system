import { sql } from "drizzle-orm";
import { db } from "./client";

export async function up() {
  console.log("Running Migration 34: Admissions & Enrollment Service");

  // Enums
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE guardian_relationship AS ENUM ('father', 'mother', 'guardian', 'other');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // Admission Applications Table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS admission_applications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      application_reference VARCHAR(50) NOT NULL,
      first_name VARCHAR(100) NOT NULL,
      middle_name VARCHAR(100),
      last_name VARCHAR(100) NOT NULL,
      date_of_birth DATE NOT NULL,
      gender gender NOT NULL,
      nationality VARCHAR(100) DEFAULT 'Nigerian',
      current_school VARCHAR(200),
      previous_academic_info TEXT,
      desired_class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
      desired_session VARCHAR(50),
      desired_term_id UUID REFERENCES terms(id) ON DELETE SET NULL,
      guardian_name VARCHAR(200) NOT NULL,
      guardian_relationship guardian_relationship NOT NULL DEFAULT 'guardian',
      guardian_email VARCHAR(255) NOT NULL,
      guardian_phone VARCHAR(50) NOT NULL,
      guardian_address TEXT,
      status VARCHAR(50) NOT NULL DEFAULT 'draft',
      source VARCHAR(100) DEFAULT 'online',
      rejection_reason TEXT,
      waitlist_reason TEXT,
      internal_notes TEXT,
      consent_recorded BOOLEAN NOT NULL DEFAULT false,
      payment_required BOOLEAN NOT NULL DEFAULT false,
      payment_verified BOOLEAN NOT NULL DEFAULT false,
      payment_reference VARCHAR(200),
      submitted_at TIMESTAMPTZ,
      reviewed_at TIMESTAMPTZ,
      reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
      decision_at TIMESTAMPTZ,
      decision_by UUID REFERENCES users(id) ON DELETE SET NULL,
      converted_student_id UUID REFERENCES students(id) ON DELETE SET NULL,
      converted_at TIMESTAMPTZ,
      converted_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Admission Documents Table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS admission_documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      application_id UUID NOT NULL REFERENCES admission_applications(id) ON DELETE CASCADE,
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      document_type VARCHAR(100) NOT NULL,
      file_name VARCHAR(500) NOT NULL,
      storage_path VARCHAR(1000) NOT NULL,
      file_size_bytes INTEGER,
      mime_type VARCHAR(100),
      verification_status VARCHAR(50) NOT NULL DEFAULT 'pending',
      verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
      verified_at TIMESTAMPTZ,
      uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Indexes
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_admission_school ON admission_applications (school_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_admission_reference_school ON admission_applications (school_id, application_reference);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_admission_reference_global ON admission_applications (application_reference);
    CREATE INDEX IF NOT EXISTS idx_admission_status ON admission_applications (school_id, status);
    CREATE INDEX IF NOT EXISTS idx_admission_guardian_email ON admission_applications (school_id, guardian_email);
    CREATE INDEX IF NOT EXISTS idx_admission_name_dob ON admission_applications (school_id, first_name, last_name, date_of_birth);
    
    CREATE INDEX IF NOT EXISTS idx_adoc_application ON admission_documents (application_id);
    CREATE INDEX IF NOT EXISTS idx_adoc_school ON admission_documents (school_id);
  `);

  console.log("Migration 34 completed successfully.");
}

async function run() {
  try {
    await up();
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

run();
